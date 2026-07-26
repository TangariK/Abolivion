import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isGuestEmail(email: string | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith('@guest.abolivion.app'));
}

function buildEmailHtml(newEmail: string, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a120e;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a120e;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#1a2a1e;border:1px solid #c4a35a;border-radius:12px;">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#a8c0a8;font-family:Segoe UI,Tahoma,sans-serif;">Early Access</div>
          <div style="margin-top:10px;font-size:34px;line-height:1.1;color:#f4d77b;">Abolivion</div>
          <div style="margin:14px auto 0;width:64px;height:2px;background:#c4a35a;"></div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;text-align:center;">
          <div style="font-size:22px;color:#e8f0e8;">Confirme seu novo e-mail</div>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#a8c0a8;font-family:Segoe UI,Tahoma,sans-serif;">
            Recebemos um pedido para vincular <strong style="color:#f4d77b;">${newEmail}</strong>
            à sua conta na tribo. Confirme abaixo para ativar a recuperação de senha e as novidades do jogo.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:28px 32px 8px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;background:#c4a35a;color:#0d1a12;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">
            Confirmar e-mail
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;text-align:center;">
          <p style="margin:0;font-size:13px;line-height:1.55;color:#7a927a;font-family:Segoe UI,Tahoma,sans-serif;">
            Se você não pediu essa alteração, ignore este e-mail. Sua conta permanece segura.
          </p>
          <p style="margin:18px 0 0;font-size:12px;color:#5a705a;font-family:Segoe UI,Tahoma,sans-serif;">
            Abolivion · a noite da floresta espera por você
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const brevoKey = Deno.env.get('BREVO_API_KEY') ?? '';
    const brevoSender = Deno.env.get('BREVO_SENDER') ?? '';
    const brevoName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Abolivion';

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: 'Supabase env incompleto na Edge Function.' });
    }
    if (!brevoKey || !brevoSender) {
      return json(500, {
        error: 'Brevo não configurado. Defina secrets BREVO_API_KEY e BREVO_SENDER.',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Não autenticado.' });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: 'Sessão inválida.' });

    const body = await req.json().catch(() => ({})) as {
      email?: string;
      acceptNewsletter?: boolean;
      redirectTo?: string;
    };

    const newEmail = (body.email ?? '').trim().toLowerCase();
    if (!isValidEmail(newEmail)) return json(400, { error: 'E-mail inválido.' });
    if (isGuestEmail(newEmail)) {
      return json(400, { error: 'Use um e-mail real, não o endereço sintético.' });
    }

    const currentEmail = userData.user.email;
    if (!currentEmail) return json(400, { error: 'Conta sem e-mail atual.' });
    if (currentEmail.toLowerCase() === newEmail) {
      return json(400, { error: 'Esse já é o e-mail da conta.' });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Gera o token de troca sem disparar o SMTP do GoTrue (que falha no @guest).
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'email_change_new',
      email: currentEmail,
      newEmail,
      options: {
        redirectTo: body.redirectTo || undefined,
      },
    });
    if (linkErr) return json(400, { error: linkErr.message });

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) return json(500, { error: 'Falha ao gerar link de confirmação.' });

    await admin.auth.admin.updateUserById(userData.user.id, {
      user_metadata: {
        ...userData.user.user_metadata,
        accept_newsletter: Boolean(body.acceptNewsletter),
      },
    });

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: brevoName, email: brevoSender },
        to: [{ email: newEmail }],
        subject: 'Abolivion — confirme seu e-mail',
        htmlContent: buildEmailHtml(newEmail, actionLink),
      }),
    });

    if (!brevoRes.ok) {
      const errText = await brevoRes.text();
      console.error('Brevo error', brevoRes.status, errText);
      if (brevoRes.status === 401 && errText.includes('authorised_ips')) {
        return json(502, {
          error:
            'Brevo bloqueou o IP. Em Security → Authorised IPs, desative a restrição de IP da API key.',
        });
      }
      return json(502, { error: 'Não foi possível enviar o e-mail de confirmação.' });
    }

    return json(200, { ok: true, pendingEmail: newEmail });
  } catch (err) {
    console.error(err);
    return json(500, { error: err instanceof Error ? err.message : 'Erro interno.' });
  }
});
