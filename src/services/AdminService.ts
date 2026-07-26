const DEV_VISION_KEY = 'abolivion_dev_vision';

export type ProfileRole = 'player' | 'admin';

/**
 * Admin = role 'admin' no perfil cloud OU rodando local (dev).
 * Dev Vision é a flag que liga/desliga cheats e destravas fora do perfil.
 */
class AdminServiceImpl {
  private role: ProfileRole = 'player';

  setRole(role: string | null | undefined): void {
    this.role = role === 'admin' ? 'admin' : 'player';
  }

  getRole(): ProfileRole {
    return this.role;
  }

  isLocalDevHost(): boolean {
    if (import.meta.env.DEV) return true;
    const host = typeof location !== 'undefined' ? location.hostname : '';
    return host === 'localhost' || host === '127.0.0.1';
  }

  isAdminCandidate(): boolean {
    return this.role === 'admin' || this.isLocalDevHost();
  }

  hasDevVision(): boolean {
    if (!this.isAdminCandidate()) return false;
    try {
      return localStorage.getItem(DEV_VISION_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  setDevVision(on: boolean): void {
    try {
      localStorage.setItem(DEV_VISION_KEY, on ? 'on' : 'off');
    } catch {
      // private mode
    }
  }
}

export const AdminService = new AdminServiceImpl();
