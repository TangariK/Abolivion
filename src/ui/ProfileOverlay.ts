import { AdminService } from '../services/AdminService';
import { AuthService } from '../services/AuthService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { ptAuthError } from '../utils/authErrors';
import { formatDuration } from '../utils/formatDuration';
import { isGuestEmail, normalizeUsername } from '../utils/username';

export type ProfileOverlayResult = {
  loggedIn: boolean;
  unlockedLoginAchievement: boolean;
};

const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

/**
 * Overlay HTML da conta: login/cadastro (convidado) e gestão (logado).
 * Campos de senha precisam de DOM real.
 */
export class ProfileOverlay {
  private root?: HTMLDivElement;
  private panel?: HTMLDivElement;
  private onCloseCb?: (result: ProfileOverlayResult) => void;
  private pendingUnlock = false;

  open(onClose: (result: ProfileOverlayResult) => void): void {
    this.close();
    this.onCloseCb = onClose;
    this.pendingUnlock = false;

    const root = document.createElement('div');
    root.id = 'abolivion-profile-overlay';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 12, 8, 0.72)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(480px, 94vw)',
      maxHeight: '92vh',
      overflowY: 'auto',
      background: 'linear-gradient(160deg, #1a2a1e 0%, #141c16 100%)',
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '22px 24px 18px',
      color: TEXT,
      boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
    } as CSSStyleDeclaration);

    root.append(panel);
    root.addEventListener('click', (ev) => {
      if (ev.target === root) this.finish(false);
    });
    document.body.append(root);
    this.root = root;
    this.panel = panel;
    this.render();
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
    this.panel = undefined;
  }

  private finish(unlockedLoginAchievement: boolean): void {
    const onClose = this.onCloseCb;
    const unlocked = unlockedLoginAchievement || this.pendingUnlock;
    this.close();
    onClose?.({ loggedIn: AuthService.isLoggedIn(), unlockedLoginAchievement: unlocked });
  }

  /** Redesenha o painel (usado quando o estado da conta muda sem fechar o overlay). */
  private render(info?: string): void {
    const panel = this.panel;
    if (!panel) return;
    panel.replaceChildren();
    const finish = (unlocked: boolean) => this.finish(unlocked);
    if (AuthService.isLoggedIn()) {
      this.buildLoggedView(panel, finish, info);
    } else {
      this.buildGuestView(panel, finish, info);
    }
    panel.scrollTop = 0;
  }

  // ————— Convidado: entrar / cadastrar —————

  private buildGuestView(
    panel: HTMLElement,
    finish: (unlocked: boolean) => void,
    info?: string,
  ): void {
    panel.append(this.title('Conta Abolivion'));
    if (info) panel.append(this.infoBox(info));
    panel.append(
      this.warnBox(
        'Sem login, o progresso fica só no cache deste navegador e pode ser perdido.',
      ),
    );

    const error = this.errorLine();

    // Abas
    const tabsRow = document.createElement('div');
    Object.assign(tabsRow.style, {
      display: 'flex',
      gap: '6px',
      margin: '4px 0 14px',
    } as CSSStyleDeclaration);
    const loginTab = this.tabButton('Entrar', true);
    const registerTab = this.tabButton('Cadastrar', false);
    tabsRow.append(loginTab, registerTab);
    panel.append(tabsRow);

    // — Entrar —
    const loginForm = document.createElement('div');
    loginForm.style.display = 'grid';
    loginForm.style.gap = '10px';
    const loginId = this.field('Usuário ou e-mail', 'text', 'seu_usuario ou voce@email.com');
    const loginPass = this.field('Senha', 'password', 'Sua senha');
    const loginBtn = this.button('Entrar', ACCENT, '#0d1a12');
    loginForm.append(loginId.wrap, loginPass.wrap, loginBtn);

    // Recuperação de senha (só existe para contas com e-mail confirmado)
    const forgotLink = this.linkButton('Esqueci minha senha');
    const forgotBox = document.createElement('div');
    Object.assign(forgotBox.style, {
      display: 'none',
      gap: '8px',
      alignItems: 'end',
    } as CSSStyleDeclaration);
    const forgotField = this.field('E-mail da conta', 'email', 'voce@email.com');
    const forgotBtn = this.smallButton('Enviar link');
    forgotBox.append(forgotField.wrap, forgotBtn);
    forgotLink.onclick = () => {
      const open = forgotBox.style.display === 'flex';
      forgotBox.style.display = open ? 'none' : 'flex';
    };
    loginForm.append(forgotLink, forgotBox);

    // — Cadastrar —
    const registerForm = document.createElement('div');
    registerForm.style.display = 'none';
    registerForm.style.gap = '10px';
    const regUser = this.field('Usuário', 'text', 'minúsculas, sem acentos ou espaços');
    regUser.input.addEventListener('input', () => {
      const cursor = regUser.input.selectionStart ?? regUser.input.value.length;
      const before = regUser.input.value;
      regUser.input.value = normalizeUsername(before);
      const diff = before.length - regUser.input.value.length;
      regUser.input.setSelectionRange(Math.max(0, cursor - diff), Math.max(0, cursor - diff));
    });
    const regPass = this.field('Senha', 'password', 'mín. 6 caracteres');
    const regEmail = this.field('E-mail (opcional)', 'email', 'voce@email.com');

    const noEmailWarn = this.warnBox(
      'Sem e-mail: não será possível recuperar a conta se você esquecer a senha, '
      + 'e você não receberá novidades do jogo.',
    );
    noEmailWarn.style.margin = '0';

    const emailHint = this.hintLine(
      'Enviaremos um link de confirmação para este e-mail. '
      + 'Você já entra no jogo antes de confirmar.',
    );
    emailHint.style.display = 'none';

    const newsCheck = this.checkbox('Aceito receber novidades do jogo pelo e-mail.');
    newsCheck.wrap.style.display = 'none';

    regEmail.input.addEventListener('input', () => {
      const hasEmail = regEmail.input.value.trim().length > 0;
      noEmailWarn.style.display = hasEmail ? 'none' : 'block';
      emailHint.style.display = hasEmail ? 'block' : 'none';
      newsCheck.wrap.style.display = hasEmail ? 'flex' : 'none';
    });

    const registerBtn = this.button('Cadastrar', '#2a2417', '#f4d77b', true);
    registerForm.append(
      regUser.wrap,
      regPass.wrap,
      regEmail.wrap,
      noEmailWarn,
      emailHint,
      newsCheck.wrap,
      registerBtn,
    );

    const closeBtn = this.button('Fechar', 'transparent', MUTED, true);
    closeBtn.style.marginTop = '10px';
    closeBtn.onclick = () => finish(false);

    const okMsg = this.okLine();
    panel.append(loginForm, registerForm, okMsg, error, closeBtn);

    const showTab = (login: boolean) => {
      loginForm.style.display = login ? 'grid' : 'none';
      registerForm.style.display = login ? 'none' : 'grid';
      this.setTabActive(loginTab, login);
      this.setTabActive(registerTab, !login);
      error.textContent = '';
      okMsg.textContent = '';
    };
    loginTab.onclick = () => showTab(true);
    registerTab.onclick = () => showTab(false);

    const busy = (on: boolean) => {
      loginBtn.disabled = on;
      registerBtn.disabled = on;
    };

    forgotBtn.onclick = async () => {
      error.textContent = '';
      okMsg.textContent = '';
      const email = forgotField.input.value.trim();
      if (!email.includes('@')) {
        error.textContent = 'Digite o e-mail cadastrado na conta.';
        return;
      }
      forgotBtn.disabled = true;
      try {
        await AuthService.requestPasswordReset(email);
        okMsg.textContent = 'Se existir uma conta com este e-mail, o link de redefinição foi enviado.';
      } catch (err) {
        error.textContent = ptAuthError(err);
      } finally {
        forgotBtn.disabled = false;
      }
    };

    loginBtn.onclick = async () => {
      error.textContent = '';
      okMsg.textContent = '';
      busy(true);
      try {
        const had = SaveManager.hasAchievement('tribe_member');
        await AuthService.signIn(loginId.input.value, loginPass.input.value);
        finish(!had && SaveManager.hasAchievement('tribe_member'));
      } catch (err) {
        error.textContent = ptAuthError(err);
        busy(false);
      }
    };

    registerBtn.onclick = async () => {
      error.textContent = '';
      const username = normalizeUsername(regUser.input.value);
      if (username.length < 3) {
        error.textContent = 'O usuário precisa ter pelo menos 3 caracteres (a–z, 0–9, _).';
        return;
      }
      if (regPass.input.value.length < 6) {
        error.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
      }
      busy(true);
      try {
        const had = SaveManager.hasAchievement('tribe_member');
        const result = await AuthService.signUp({
          username,
          password: regPass.input.value,
          email: regEmail.input.value.trim() || undefined,
          acceptNewsletter: newsCheck.input.checked,
        });
        this.pendingUnlock = !had && SaveManager.hasAchievement('tribe_member');

        if (result.pendingEmail) {
          this.render(
            `Conta criada! Enviamos um link de confirmação para ${result.pendingEmail}. `
            + 'Você já pode jogar — confirmar o e-mail só é necessário para recuperar a senha.',
          );
          return;
        }
        if (result.emailWarning) {
          this.render(
            `Conta criada, mas não conseguimos vincular o e-mail (${result.emailWarning}) `
            + 'Você pode tentar de novo aqui no perfil.',
          );
          return;
        }
        finish(false);
      } catch (err) {
        error.textContent = ptAuthError(err);
        busy(false);
      }
    };

    if (!isSupabaseConfigured()) {
      error.textContent =
        'Conta indisponível: falta VITE_SUPABASE_ANON_KEY no .env (chave anon/publishable do projeto).';
      loginBtn.disabled = true;
      registerBtn.disabled = true;
    }
  }

  // ————— Logado: gestão da conta —————

  private buildLoggedView(
    panel: HTMLElement,
    finish: (unlocked: boolean) => void,
    info?: string,
  ): void {
    const profile = SaveManager.load();
    const best = profile.bestScores;
    const pendingEmail = AuthService.pendingEmail();
    const realEmail = AuthService.hasRealEmail()
      ? (AuthService.getUser()?.email ?? null)
      : null;

    // Cabeçalho
    const hero = document.createElement('div');
    Object.assign(hero.style, { textAlign: 'center', marginBottom: '6px' } as CSSStyleDeclaration);
    const nameEl = document.createElement('div');
    nameEl.textContent = AuthService.username();
    Object.assign(nameEl.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '28px',
      color: '#f4d77b',
      letterSpacing: '0.02em',
    } as CSSStyleDeclaration);
    const sub = document.createElement('div');
    sub.textContent = 'Jogador';
    Object.assign(sub.style, {
      fontSize: '11px',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: MUTED,
      marginTop: '4px',
    } as CSSStyleDeclaration);
    hero.append(nameEl, sub);
    panel.append(hero);
    if (info) panel.append(this.infoBox(info));

    const error = this.errorLine();
    const okMsg = this.okLine();
    const feedback = (ok: string) => {
      error.textContent = '';
      okMsg.textContent = ok;
    };
    const fail = (err: unknown) => {
      okMsg.textContent = '';
      error.textContent = ptAuthError(err);
    };

    // —— Informações básicas ——
    const infoSection = this.sectionBlock('Informações básicas da conta');
    infoSection.append(
      this.statRow('Tempo jogado', formatDuration(best?.totalPlayMs ?? 0)),
      this.statRow('Data de criação', this.formatAccountDate(AuthService.accountCreatedAt())),
    );

    // Usuário (editável)
    const userEdit = this.editableRow(
      'Usuário',
      AuthService.username(),
      'edit',
      (value, close) => {
        const username = normalizeUsername(value);
        if (username.length < 3) {
          fail(new Error('usuario_invalido'));
          return;
        }
        void AuthService.changeUsername(username)
          .then(() => {
            feedback('Usuário atualizado.');
            this.render('Usuário atualizado.');
            close();
          })
          .catch(fail);
      },
      { normalize: true, inputType: 'text' },
    );
    infoSection.append(userEdit);

    // E-mail
    if (pendingEmail) {
      const pendingBox = this.warnBox(
        `Confirmação pendente: ${pendingEmail}. Clique no link do e-mail ou reenvie.`,
      );
      pendingBox.style.margin = '0';
      const pendingActions = document.createElement('div');
      Object.assign(pendingActions.style, {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      } as CSSStyleDeclaration);
      const resendBtn = this.smallButton('Reenviar link');
      resendBtn.onclick = async () => {
        resendBtn.disabled = true;
        try {
          await AuthService.resendEmailConfirmation();
          feedback('Link reenviado. Confira a caixa de entrada e o spam.');
        } catch (err) {
          fail(err);
        } finally {
          resendBtn.disabled = false;
        }
      };
      const doneBtn = this.smallButton('Já confirmei');
      doneBtn.onclick = async () => {
        doneBtn.disabled = true;
        try {
          await AuthService.refreshUser();
          if (AuthService.hasRealEmail() && !AuthService.pendingEmail()) {
            this.render('E-mail confirmado! Recuperação de senha ativada.');
            return;
          }
          fail(new Error('confirmacao_pendente'));
        } catch (err) {
          fail(err);
        }
        doneBtn.disabled = false;
      };
      pendingActions.append(resendBtn, doneBtn);
      infoSection.append(pendingBox, pendingActions);
    } else if (realEmail) {
      infoSection.append(
        this.editableRow(
          'E-mail',
          realEmail,
          'edit',
          (value, close) => {
            void AuthService.attachEmail(value, AuthService.acceptsNewsletter())
              .then(() => {
                this.render(
                  `Enviamos um link de confirmação para ${value.trim()}. `
                  + 'Clique nele para ativar a recuperação de senha.',
                );
                close();
              })
              .catch(fail);
          },
          { inputType: 'email', placeholder: 'novo@email.com' },
        ),
      );
    } else {
      infoSection.append(
        this.editableRow(
          'E-mail',
          'Não cadastrado',
          'add',
          (value, close) => {
            void AuthService.attachEmail(value, false)
              .then(() => {
                this.render(
                  `Enviamos um link de confirmação para ${value.trim()}. `
                  + 'Clique nele para ativar a recuperação de senha.',
                );
                close();
              })
              .catch(fail);
          },
          { inputType: 'email', placeholder: 'voce@email.com' },
        ),
      );
    }
    panel.append(infoSection);

    // —— Opções ——
    const optionsSection = this.sectionBlock('Opções');
    const passWrap = document.createElement('div');
    const resetPassBtn = this.button('Resetar senha', '#2a2417', '#f4d77b', true);
    const passEditor = document.createElement('div');
    passEditor.style.display = 'none';
    passEditor.style.marginTop = '8px';
    const passField = this.field('Nova senha', 'password', 'mín. 6 caracteres');
    const passSave = this.smallButton('Salvar senha');
    passSave.onclick = async () => {
      if (passField.input.value.length < 6) {
        error.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
      }
      try {
        await AuthService.changePassword(passField.input.value);
        passField.input.value = '';
        passEditor.style.display = 'none';
        feedback('Senha atualizada.');
      } catch (err) {
        fail(err);
      }
    };
    passEditor.append(this.fieldWithButton(passField.wrap, passSave));
    resetPassBtn.onclick = () => {
      passEditor.style.display = passEditor.style.display === 'none' ? 'block' : 'none';
    };
    passWrap.append(resetPassBtn, passEditor);
    optionsSection.append(passWrap);

    const tagCheck = this.checkbox('Mostrar tag com meu nome durante o jogo');
    tagCheck.input.checked = profile.prefs?.showNameTag ?? false;
    tagCheck.input.addEventListener('change', () => {
      void AuthService.setShowNameTag(tagCheck.input.checked).catch(fail);
    });
    optionsSection.append(tagCheck.wrap);

    if (realEmail || pendingEmail) {
      const newsCheck = this.checkbox('Receber novidades do jogo por e-mail');
      newsCheck.input.checked = AuthService.acceptsNewsletter();
      newsCheck.input.addEventListener('change', () => {
        void AuthService.setAcceptNewsletter(newsCheck.input.checked)
          .then(() =>
            feedback(
              newsCheck.input.checked
                ? 'Você receberá novidades do jogo.'
                : 'Você não receberá mais novidades.',
            ),
          )
          .catch(fail);
      });
      optionsSection.append(newsCheck.wrap);
    }
    panel.append(optionsSection);

    // —— Legado ——
    panel.append(this.buildLegacySection(profile));

    // —— Dev ——
    if (AdminService.isAdminCandidate()) {
      panel.append(this.buildDevSection(feedback, fail, error));
    }

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginTop: '14px',
    } as CSSStyleDeclaration);
    const logoutBtn = this.button('Sair da conta', '#3a2222', '#e8c0b8', true);
    logoutBtn.onclick = async () => {
      logoutBtn.disabled = true;
      try {
        await AuthService.signOut();
        finish(false);
      } catch (err) {
        fail(err);
        logoutBtn.disabled = false;
      }
    };
    const closeBtn = this.button('Fechar', 'transparent', MUTED, true);
    closeBtn.onclick = () => finish(false);
    actions.append(logoutBtn, closeBtn);
    panel.append(okMsg, error, actions);
  }

  private buildLegacySection(profile: ReturnType<typeof SaveManager.load>): HTMLElement {
    const best = profile.bestScores;
    const section = this.sectionBlock('Legado');
    section.style.background = 'rgba(196,163,90,0.06)';
    section.style.border = '1px solid rgba(196,163,90,0.28)';
    section.style.borderRadius = '10px';
    section.style.padding = '12px 14px 14px';

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px 14px',
      marginTop: '4px',
    } as CSSStyleDeclaration);

    const items: Array<[string, string]> = [
      ['Maior sobrevivência', formatDuration(best?.infiniteMs ?? 0)],
      ['Maior sequência de abates', this.formatNumber(best?.bestKillStreak ?? 0)],
      ['Chefes derrotados', this.formatNumber(best?.bossesDefeated ?? 0)],
      ['Nível máximo', this.formatNumber(best?.bestLevel ?? 1)],
      ['Inimigos eliminados', this.formatNumber(best?.kills ?? 0)],
      ['Moedas coletadas', this.formatNumber(best?.totalCoinsEarned ?? 0)],
      ['Melhor rodada', this.formatNumber(best?.wavesReached ?? 0)],
      [
        'Menor vida ao sobreviver',
        best?.lowestHpSurvive && best.lowestHpSurvive > 0
          ? `${best.lowestHpSurvive} HP`
          : '—',
      ],
      [
        'Precisão máxima',
        best?.bestAccuracy && best.bestAccuracy > 0 ? `${best.bestAccuracy}%` : '—',
      ],
    ];

    for (const [label, value] of items) {
      const card = document.createElement('div');
      Object.assign(card.style, {
        padding: '8px 4px',
        borderTop: '1px solid rgba(196,163,90,0.15)',
      } as CSSStyleDeclaration);
      const l = document.createElement('div');
      l.textContent = label;
      Object.assign(l.style, {
        fontSize: '11px',
        color: MUTED,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: '4px',
      } as CSSStyleDeclaration);
      const v = document.createElement('div');
      v.textContent = value;
      Object.assign(v.style, {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '20px',
        color: '#f4d77b',
        lineHeight: '1.2',
      } as CSSStyleDeclaration);
      card.append(l, v);
      grid.append(card);
    }
    section.append(grid);
    return section;
  }

  private buildDevSection(
    feedback: (ok: string) => void,
    fail: (err: unknown) => void,
    error: HTMLElement,
  ): HTMLElement {
    const devSection = this.sectionBlock('Painel Dev');
    Object.assign(devSection.style, {
      border: '1px dashed rgba(196,163,90,0.5)',
      borderRadius: '8px',
      padding: '10px 12px',
    } as CSSStyleDeclaration);

    const coinsField = this.field('Dar moedas', 'number', 'quantidade');
    const coinsBtn = this.smallButton('Adicionar');
    coinsBtn.onclick = () => {
      const amount = parseInt(coinsField.input.value, 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        error.textContent = 'Digite uma quantidade válida de moedas.';
        return;
      }
      SaveManager.addCurrency(amount);
      coinsField.input.value = '';
      feedback(`+${amount} moedas adicionadas.`);
    };
    devSection.append(this.fieldWithButton(coinsField.wrap, coinsBtn));

    const devVisionCheck = this.checkbox('Visão de Dev (cheats e destravas fora do perfil)');
    devVisionCheck.input.checked = AdminService.hasDevVision();
    devVisionCheck.input.addEventListener('change', () => {
      AdminService.setDevVision(devVisionCheck.input.checked);
      feedback(devVisionCheck.input.checked ? 'Visão de Dev ativada.' : 'Visão de Dev desativada.');
    });
    devSection.append(devVisionCheck.wrap);

    const resetBtn = this.button('Zerar progresso desta conta', '#3a2222', '#e8c0b8', true);
    resetBtn.onclick = async () => {
      const ok = window.confirm(
        'Isso zera moedas, meta, Marã e recordes desta conta (local e nuvem).\n'
        + 'Usuário, senha e e-mail permanecem. Continuar?',
      );
      if (!ok) return;
      resetBtn.disabled = true;
      try {
        await AuthService.resetAccountProgress();
        this.render('Progresso zerado.');
      } catch (err) {
        fail(err);
      } finally {
        resetBtn.disabled = false;
      }
    };
    devSection.append(resetBtn);
    return devSection;
  }

  private sectionBlock(titleText: string): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      display: 'grid',
      gap: '10px',
      marginTop: '16px',
    } as CSSStyleDeclaration);
    const heading = document.createElement('div');
    heading.textContent = titleText;
    Object.assign(heading.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '15px',
      color: ACCENT,
      borderBottom: '1px solid rgba(196,163,90,0.35)',
      paddingBottom: '6px',
      letterSpacing: '0.03em',
    } as CSSStyleDeclaration);
    wrap.append(heading);
    return wrap;
  }

  private statRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'baseline',
      fontSize: '13px',
    } as CSSStyleDeclaration);
    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = MUTED;
    const v = document.createElement('span');
    v.textContent = value;
    Object.assign(v.style, { color: TEXT, textAlign: 'right' } as CSSStyleDeclaration);
    row.append(l, v);
    return row;
  }

  private editableRow(
    label: string,
    displayValue: string,
    mode: 'edit' | 'add',
    onSave: (value: string, close: () => void) => void,
    opts?: { normalize?: boolean; inputType?: string; placeholder?: string },
  ): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { display: 'grid', gap: '6px' } as CSSStyleDeclaration);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'space-between',
    } as CSSStyleDeclaration);

    const left = document.createElement('div');
    Object.assign(left.style, { minWidth: '0', flex: '1 1 auto' } as CSSStyleDeclaration);
    const l = document.createElement('div');
    l.textContent = label;
    Object.assign(l.style, { fontSize: '11px', color: MUTED, marginBottom: '2px' } as CSSStyleDeclaration);
    const v = document.createElement('div');
    v.textContent = displayValue;
    Object.assign(v.style, {
      fontSize: '14px',
      color: TEXT,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    } as CSSStyleDeclaration);
    left.append(l, v);

    const iconBtn = document.createElement('button');
    iconBtn.type = 'button';
    iconBtn.title = mode === 'add' ? 'Adicionar' : 'Editar';
    iconBtn.textContent = mode === 'add' ? '+' : '✎';
    Object.assign(iconBtn.style, {
      width: '34px',
      height: '34px',
      borderRadius: '8px',
      border: `1px solid ${ACCENT}`,
      background: '#2a2417',
      color: '#f4d77b',
      fontSize: mode === 'add' ? '18px' : '14px',
      cursor: 'pointer',
      flex: '0 0 auto',
    } as CSSStyleDeclaration);

    const editor = document.createElement('div');
    editor.style.display = 'none';
    const field = this.field(
      mode === 'add' ? `Adicionar ${label.toLowerCase()}` : `Novo ${label.toLowerCase()}`,
      opts?.inputType ?? 'text',
      opts?.placeholder ?? displayValue,
    );
    if (opts?.normalize) {
      field.input.addEventListener('input', () => {
        field.input.value = normalizeUsername(field.input.value);
      });
    }
    const saveBtn = this.smallButton('Salvar');
    const close = () => {
      editor.style.display = 'none';
    };
    saveBtn.onclick = () => {
      const value = field.input.value.trim();
      if (!value) {
        return;
      }
      onSave(value, close);
    };
    editor.append(this.fieldWithButton(field.wrap, saveBtn));

    iconBtn.onclick = () => {
      const open = editor.style.display === 'none';
      editor.style.display = open ? 'block' : 'none';
      if (open) {
        field.input.value = mode === 'add' ? '' : (isGuestEmail(displayValue) ? '' : displayValue);
        field.input.focus();
      }
    };

    row.append(left, iconBtn);
    wrap.append(row, editor);
    return wrap;
  }

  private formatAccountDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  private formatNumber(n: number): string {
    return Math.max(0, Math.floor(n)).toLocaleString('pt-BR');
  }

  // ————— DOM helpers —————

  private title(text: string): HTMLElement {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '26px',
      color: '#f4d77b',
      marginBottom: '8px',
    } as CSSStyleDeclaration);
    return el;
  }

  private warnBox(text: string): HTMLParagraphElement {
    const el = document.createElement('p');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '13px',
      lineHeight: '1.45',
      color: '#d4b86a',
      background: 'rgba(196,163,90,0.12)',
      border: '1px solid rgba(196,163,90,0.35)',
      borderRadius: '6px',
      padding: '10px 12px',
      margin: '0 0 12px',
    } as CSSStyleDeclaration);
    return el;
  }

  private infoBox(text: string): HTMLParagraphElement {
    const el = document.createElement('p');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '13px',
      lineHeight: '1.45',
      color: '#8fd6a0',
      background: 'rgba(143,214,160,0.12)',
      border: '1px solid rgba(143,214,160,0.35)',
      borderRadius: '6px',
      padding: '10px 12px',
      margin: '0 0 12px',
    } as CSSStyleDeclaration);
    return el;
  }

  private hintLine(text: string): HTMLParagraphElement {
    const el = document.createElement('p');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '12px',
      lineHeight: '1.4',
      color: MUTED,
      margin: '0',
    } as CSSStyleDeclaration);
    return el;
  }

  private okLine(): HTMLParagraphElement {
    const el = document.createElement('p');
    Object.assign(el.style, {
      color: '#8fd6a0',
      fontSize: '13px',
      margin: '0',
      minHeight: '18px',
    } as CSSStyleDeclaration);
    return el;
  }

  private linkButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      border: 'none',
      background: 'transparent',
      color: MUTED,
      fontSize: '12px',
      textDecoration: 'underline',
      cursor: 'pointer',
      padding: '0',
      justifySelf: 'start',
    } as CSSStyleDeclaration);
    return btn;
  }

  private errorLine(): HTMLParagraphElement {
    const el = document.createElement('p');
    Object.assign(el.style, {
      color: '#e08a7a',
      fontSize: '13px',
      margin: '8px 0 0',
      minHeight: '18px',
    } as CSSStyleDeclaration);
    return el;
  }

  private field(label: string, type: string, placeholder: string) {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'grid',
      gap: '4px',
      fontSize: '12px',
      color: MUTED,
      flex: '1 1 auto',
    } as CSSStyleDeclaration);
    wrap.textContent = label;
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete =
      type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'on';
    Object.assign(input.style, {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #4a5c4a',
      background: '#0d1a12',
      color: TEXT,
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    } as CSSStyleDeclaration);
    wrap.append(input);
    return { wrap, input };
  }

  private fieldWithButton(fieldWrap: HTMLElement, btn: HTMLButtonElement): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'end',
    } as CSSStyleDeclaration);
    row.append(fieldWrap, btn);
    return row;
  }

  private checkbox(label: string) {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: TEXT,
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    const input = document.createElement('input');
    input.type = 'checkbox';
    wrap.append(input, document.createTextNode(label));
    return { wrap, input };
  }

  private tabButton(label: string, active: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1 1 auto',
      padding: '8px 10px',
      borderRadius: '6px',
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '15px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    this.setTabActive(btn, active);
    return btn;
  }

  private setTabActive(btn: HTMLButtonElement, active: boolean): void {
    Object.assign(btn.style, {
      border: `1px solid ${ACCENT}`,
      background: active ? ACCENT : 'transparent',
      color: active ? '#0d1a12' : '#f4d77b',
    } as CSSStyleDeclaration);
  }

  private smallButton(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${ACCENT}`,
      background: '#2a2417',
      color: '#f4d77b',
      fontSize: '13px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    } as CSSStyleDeclaration);
    return btn;
  }

  private button(
    label: string,
    bg: string,
    color: string,
    outlined = false,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1 1 auto',
      minWidth: '110px',
      padding: '10px 12px',
      borderRadius: '6px',
      border: outlined ? `1px solid ${ACCENT}` : 'none',
      background: bg,
      color,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '15px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    return btn;
  }
}
