/**
 * Deploy da Edge Function attach-email + secrets Brevo.
 * Pré-requisito: `npx supabase login` (uma vez) e Authorised IPs desligado no Brevo.
 *
 * Uso: npm run functions:deploy
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const PROJECT_REF = 'rjhwjhfrrmwwqmkpyupc';
const apiKey = process.env.BREVO_API_KEY?.trim();
const sender = process.env.BREVO_SENDER?.trim();
const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'Abolivion';

if (!apiKey) {
  console.error('Defina BREVO_API_KEY no .env');
  process.exit(1);
}
if (!sender) {
  console.error('Defina BREVO_SENDER no .env (remetente verificado no Brevo)');
  process.exit(1);
}

function run(args) {
  console.log('>', 'npx supabase', ...args.map((a) => (a.includes('xkeysib') ? '***' : a)));
  const r = spawnSync('npx', ['supabase', ...args], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run([
  'secrets',
  'set',
  `BREVO_API_KEY=${apiKey}`,
  `BREVO_SENDER=${sender}`,
  `BREVO_SENDER_NAME=${senderName}`,
  '--project-ref',
  PROJECT_REF,
]);

run(['functions', 'deploy', 'attach-email', '--project-ref', PROJECT_REF]);

console.log('\nOK — attach-email no ar. Teste vincular e-mail no perfil do jogo.');
