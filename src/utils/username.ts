/** Normaliza para o padrão de usuário: minúsculas, sem acentos/espaços/símbolos. */
export function normalizeUsername(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

const GUEST_EMAIL_DOMAIN = 'guest.abolivion.app';

/** E-mail sintético usado quando o jogador cadastra sem e-mail real. */
export function guestEmailFor(username: string): string {
  return `${username}@${GUEST_EMAIL_DOMAIN}`;
}

export function isGuestEmail(email: string | undefined | null): boolean {
  return Boolean(email?.endsWith(`@${GUEST_EMAIL_DOMAIN}`));
}
