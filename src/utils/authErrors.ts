/** Converte erros do Supabase Auth em mensagens claras em português. */

function authErrorBlob(err: unknown): string {
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const extra = err as Error & { code?: string; status?: number };
    return [err.message, extra.code, String(extra.status ?? '')].filter(Boolean).join(' ');
  }
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    return [o.message, o.msg, o.code, o.error_description, o.error]
      .filter((v) => typeof v === 'string' && v.length > 0)
      .join(' ');
  }
  return String(err);
}

/** Falha de SMTP/mailer do GoTrue: a alteração de e-mail é descartada. */
export function isMailerFailure(err: unknown): boolean {
  const m = authErrorBlob(err).toLowerCase();
  return (
    m.includes('error sending email')
    || m.includes('sending confirmation')
    || m.includes('sending email change')
    || m.includes('smtp')
    || (m.includes('unexpected_failure') && m.includes('email'))
  );
}

export function ptAuthError(err: unknown): string {
  const raw = authErrorBlob(err) || (err instanceof Error ? err.message : String(err ?? ''));
  const m = raw.toLowerCase();

  if (m.includes('apenas a conta de dev') || m.includes('resetar o progresso')) {
    return raw;
  }
  if (isMailerFailure(err)) {
    return 'O e-mail não pôde ser vinculado: o servidor recusou o envio ao endereço interno da conta. Nenhuma alteração foi salva.';
  }
  if (m.includes('authorised_ips') || m.includes('authorized_ips') || m.includes('bloqueou o ip')) {
    return 'O Brevo bloqueou o envio por restrição de IP. Desative Authorised IPs no painel Brevo e tente de novo.';
  }
  if (m.includes('brevo não configurado') || m.includes('brevo_api_key')) {
    return 'Envio de e-mail ainda não configurado no servidor. Peça ao dev para definir os secrets da Edge Function.';
  }
  if (m.includes('não foi possível enviar o e-mail')) {
    return 'Não foi possível enviar o e-mail de confirmação. Verifique o remetente no Brevo e tente de novo.';
  }
  if (m.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  if (m.includes('invalid login credentials')) {
    return 'Usuário/e-mail ou senha incorretos.';
  }
  if (m.includes('email not confirmed')) {
    return 'Esta conta ainda não foi confirmada.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('invalid format')) {
    return 'E-mail inválido.';
  }
  if (
    m.includes('duplicate key')
    || m.includes('username_key')
    || m.includes('usuario_em_uso')
  ) {
    return 'Este nome de usuário já está em uso.';
  }
  if (m.includes('usuario_invalido')) {
    return 'Usuário inválido: use de 3 a 20 caracteres (a–z, 0–9, _).';
  }
  if (m.includes('same as the existing') || m.includes('should be different')) {
    return 'Este já é o valor atual.';
  }
  if (m.includes('confirmacao_pendente')) {
    return 'Ainda não recebemos a confirmação. Clique no link do e-mail e tente de novo.';
  }
  if (m.includes('nenhum e-mail aguardando')) {
    return raw;
  }
  if (m.includes('você precisa estar logado')) {
    return raw;
  }
  if (m.includes('usuario_nao_encontrado')) {
    return 'Usuário não encontrado.';
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  if (m.includes('supabase não configurado')) {
    return raw;
  }
  if (m.includes('permission denied') || m.includes('42501')) {
    return 'Sem permissão para salvar o perfil. Atualize o jogo ou rode db:migrate.';
  }
  if (m.includes('unexpected_failure')) {
    return 'O servidor de autenticação falhou ao processar o pedido. Tente de novo em instantes.';
  }
  return 'Algo deu errado. Tente novamente.';
}
