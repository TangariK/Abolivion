import type { Session, User } from '@supabase/supabase-js';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { ptAuthError } from '../utils/authErrors';
import { guestEmailFor, isGuestEmail, isValidUsername, normalizeUsername } from '../utils/username';
import { AdminService } from './AdminService';
import { flushCloudSync, pullAndMergeCloudProfile, pushProfileFlags } from './CloudSync';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

type AuthListener = (user: User | null) => void;

export interface SignUpOptions {
  username: string;
  password: string;
  email?: string;
  acceptNewsletter?: boolean;
}

export interface SignUpResult {
  /** E-mail informado, aguardando o clique no link de confirmação. */
  pendingEmail: string | null;
  /** Falha ao disparar a confirmação (a conta já existe e está utilizável). */
  emailWarning?: string;
}

class AuthServiceImpl {
  private user: User | null = null;
  private listeners = new Set<AuthListener>();
  private initPromise: Promise<void> | null = null;
  private emailFlagsSyncedFor: string | null = null;

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  getUser(): User | null {
    return this.user;
  }

  isLoggedIn(): boolean {
    return this.user !== null;
  }

  username(): string {
    if (!this.user) return 'convidado';
    const meta = this.user.user_metadata as
      | { username?: string; display_name?: string }
      | undefined;
    return (
      meta?.username
      || meta?.display_name
      || this.user.email?.split('@')[0]
      || 'cacador'
    );
  }

  displayName(): string {
    return this.isLoggedIn() ? this.username() : 'Convidado';
  }

  hasRealEmail(): boolean {
    if (!this.user) return false;
    return Boolean(this.user.email) && !isGuestEmail(this.user.email);
  }

  /**
   * E-mail informado mas ainda não confirmado. O Supabase mantém a troca em
   * `new_email` até o jogador clicar no link.
   */
  pendingEmail(): string | null {
    const pending = (this.user as (User & { new_email?: string }) | null)?.new_email;
    return pending && !isGuestEmail(pending) ? pending : null;
  }

  acceptsNewsletter(): boolean {
    return Boolean(SaveManager.load().prefs?.acceptNewsletter);
  }

  onChange(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      this.emit();
      return;
    }

    const { data } = await supabase.auth.getSession();
    await this.applySession(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      void this.applySession(session);
    });

    this.emit();
  }

  private async applySession(session: Session | null): Promise<void> {
    const next = session?.user ?? null;
    const changed = next?.id !== this.user?.id;
    this.user = next;
    if (!next) {
      AdminService.setRole('player');
      this.emailFlagsSyncedFor = null;
      SaveManager.bindGuest();
    }
    if (changed && next) {
      try {
        await pullAndMergeCloudProfile(next.id);
        SaveManager.unlockAchievement('tribe_member');
      } catch (err) {
        console.warn('[Abolivion] failed to merge cloud profile', err);
      }
    }
    this.syncEmailFlags();
    this.emit();
  }

  /** Marca no perfil cloud que o e-mail foi confirmado (e o opt-in de novidades). */
  private syncEmailFlags(): void {
    const user = this.user;
    if (!user || !this.hasRealEmail()) return;
    if (this.emailFlagsSyncedFor === user.id) return;
    this.emailFlagsSyncedFor = user.id;
    void pushProfileFlags(user.id, {
      has_real_email: true,
      accept_newsletter: this.acceptsNewsletter(),
    }).catch((err) => {
      this.emailFlagsSyncedFor = null;
      console.warn('[Abolivion] failed to sync email flags', err);
    });
  }

  /** Rebusca o usuário no servidor (usado para detectar confirmação de e-mail). */
  async refreshUser(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !this.user) return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;
    this.user = data.user;
    this.syncEmailFlags();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.user);
  }

  /**
   * Cadastro em duas etapas: a conta nasce com e-mail sintético (entra na hora,
   * sem confirmação) e, se o jogador informou um e-mail real, ele é anexado via
   * `updateUser` — o que dispara o link de confirmação só nesse caso.
   */
  async signUp(options: SignUpOptions): Promise<SignUpResult> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_ANON_KEY no .env.');

    const username = normalizeUsername(options.username);
    if (!isValidUsername(username)) {
      throw new Error('usuario_invalido');
    }

    const { data: available } = await supabase.rpc('abolivion_username_available', {
      p_username: username,
    });
    if (available === false) throw new Error('usuario_em_uso');

    const guestEmail = guestEmailFor(username);
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: options.password,
      options: {
        data: {
          username,
          display_name: username,
          has_real_email: false,
          accept_newsletter: false,
        },
      },
    });
    if (error) {
      // A conta sempre nasce com o e-mail sintético do usuário: colisão = nome em uso.
      if (/already.*registered/i.test(error.message)) throw new Error('usuario_em_uso');
      throw error;
    }

    if (data.session) {
      await this.applySession(data.session);
    } else {
      // Sem sessão (confirmação de e-mail ligada no projeto) — entra na hora.
      await this.signIn(guestEmail, options.password);
    }

    const realEmail = options.email?.trim() || '';
    if (!realEmail) return { pendingEmail: null };

    try {
      await this.attachEmail(realEmail, Boolean(options.acceptNewsletter));
      // Mesmo se o mailer falhou no guest, o link costuma ter ido ao e-mail real.
      return { pendingEmail: this.pendingEmail() ?? realEmail };
    } catch (err) {
      return { pendingEmail: null, emailWarning: ptAuthError(err) };
    }
  }

  /**
   * Anexa/troca o e-mail real via Edge Function (generateLink + Brevo).
   * Evita o SMTP do GoTrue, que falha com o endereço @guest.abolivion.app.
   */
  async attachEmail(email: string, acceptNewsletter: boolean): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !this.user) throw new Error('Você precisa estar logado.');

    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) throw new Error('invalid email');

    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      pendingEmail?: string;
      error?: string;
    }>('attach-email', {
      body: {
        email: trimmed,
        acceptNewsletter,
        redirectTo: window.location.origin,
      },
    });

    const payloadError =
      data && typeof data === 'object' && typeof data.error === 'string' ? data.error : null;
    if (error || payloadError) {
      throw new Error(payloadError || error?.message || 'Falha ao vincular e-mail.');
    }

    await this.refreshUser();
    this.emit();
  }

  /** Reenvia o link de confirmação do e-mail pendente (mesmo fluxo Brevo). */
  async resendEmailConfirmation(): Promise<void> {
    const pending = this.pendingEmail();
    if (!this.user || !pending) {
      throw new Error('Nenhum e-mail aguardando confirmação.');
    }
    await this.attachEmail(pending, this.acceptsNewsletter());
  }

  accountCreatedAt(): string | null {
    return this.user?.created_at ?? null;
  }

  /** Envia o e-mail de redefinição de senha (só funciona com e-mail confirmado). */
  async requestPasswordReset(email: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_ANON_KEY no .env.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  }

  async setAcceptNewsletter(accept: boolean): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !this.user) throw new Error('Você precisa estar logado.');
    const { data, error } = await supabase.auth.updateUser({
      data: { accept_newsletter: accept },
    });
    if (error) throw error;
    if (data.user) this.user = data.user;
    const profile = SaveManager.load();
    profile.prefs = { ...profile.prefs, showNameTag: profile.prefs?.showNameTag ?? false, acceptNewsletter: accept };
    SaveManager.save(profile, { skipCloud: true });
    await pushProfileFlags(this.user.id, { accept_newsletter: accept });
    this.emit();
  }

  /** Aceita usuário ou e-mail. */
  async signIn(identifier: string, password: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_ANON_KEY no .env.');

    const trimmed = identifier.trim();
    let email = trimmed;

    if (!trimmed.includes('@')) {
      const username = normalizeUsername(trimmed);
      const { data: resolved } = await supabase.rpc('abolivion_login_email', {
        p_username: username,
      });
      email = (resolved as string | null) || guestEmailFor(username);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.applySession(data.session);
  }

  async changePassword(newPassword: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !this.user) throw new Error('Você precisa estar logado.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async changeUsername(rawUsername: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !this.user) throw new Error('Você precisa estar logado.');

    const username = normalizeUsername(rawUsername);
    if (!isValidUsername(username)) throw new Error('usuario_invalido');

    const { error: profileError } = await supabase
      .from('abolivion_profiles')
      .update({ username, display_name: username })
      .eq('id', this.user.id);
    if (profileError) throw profileError;

    const { data, error } = await supabase.auth.updateUser({
      data: { username, display_name: username },
    });
    if (error) throw error;
    if (data.user) this.user = data.user;
    this.emit();
  }

  async setShowNameTag(show: boolean): Promise<void> {
    const profile = SaveManager.load();
    profile.prefs = { ...profile.prefs, showNameTag: show };
    SaveManager.save(profile, { skipCloud: true });
    if (this.user) {
      await pushProfileFlags(this.user.id, { show_name_tag: show });
    }
  }

  async setMuralVisibility(visibility: 'public' | 'anonymous' | 'invisible'): Promise<void> {
    const profile = SaveManager.load();
    let alias = profile.prefs?.muralAlias;
    if (visibility === 'anonymous' && !alias) {
      const { stableTreeAlias } = await import('../utils/treeNames');
      alias = stableTreeAlias(this.user?.id || this.username() || 'local');
    }
    profile.prefs = {
      ...profile.prefs,
      showNameTag: profile.prefs?.showNameTag ?? false,
      muralVisibility: visibility,
      muralAlias: alias,
    };
    SaveManager.save(profile, { skipCloud: true });
    if (this.user) {
      await pushProfileFlags(this.user.id, {
        mural_visibility: visibility,
        mural_alias: alias ?? null,
      });
    }
  }

  /**
   * Zera o progresso de jogo da conta (local + nuvem). Só para admin/dev.
   * Não apaga usuário, senha, e-mail nem role.
   */
  async resetAccountProgress(): Promise<void> {
    if (!AdminService.isAdminCandidate()) {
      throw new Error('Apenas a conta de dev pode resetar o progresso.');
    }
    const cleared = SaveManager.resetProgress();
    if (this.user) {
      // Push explícito do perfil zerado (não só o debounce do save).
      const { pushCloudProfile } = await import('./CloudSync');
      await pushCloudProfile(this.user.id, cleared);
    }
  }

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    if (this.user) await flushCloudSync(this.user.id);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.user = null;
    AdminService.setRole('player');
    SaveManager.bindGuest();
    this.emit();
  }

  async syncNow(): Promise<void> {
    if (!this.user) return;
    await flushCloudSync(this.user.id);
  }
}

export const AuthService = new AuthServiceImpl();
