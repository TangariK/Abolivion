/**
 * Busca e baixa previews HQ (ogg) do Freesound (CC0) para public/audio/.
 * Uso: FREESOUND_API_KEY no .env → npm run audio:fetch
 *
 * Previews não exigem OAuth. Originais sim — aqui usamos só preview-hq-ogg/mp3.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const TOKEN = process.env.FREESOUND_API_KEY?.trim();
if (!TOKEN) {
  console.error('Falta FREESOUND_API_KEY no .env');
  process.exit(1);
}

const API = 'https://freesound.org/apiv2';

/** Queries preferindo CC0; duração aproximada via filtro. */
const JOBS = [
  { out: 'public/audio/music/menu.ogg', queries: ['ambient loop soft', 'dark ambient loop'], minDur: 10, maxDur: 300 },
  { out: 'public/audio/music/run.ogg', queries: ['game music loop', 'adventure ambient loop'], minDur: 10, maxDur: 300 },
  { out: 'public/audio/music/boss_kurupi.ogg', queries: ['dark battle loop', 'epic battle loop', 'boss fight loop'], minDur: 8, maxDur: 240 },
  {
    out: 'public/audio/music/boss_boitata.ogg',
    queries: [
      'orchestral battle loop',
      'epic fantasy battle loop',
      'dramatic choir loop',
      'intense orchestral loop',
    ],
    minDur: 15,
    maxDur: 240,
  },
  { out: 'public/audio/music/boss_wolf.ogg', queries: ['battle loop', 'action loop dark'], minDur: 8, maxDur: 240 },
  { out: 'public/audio/music/boss_poison.ogg', queries: ['dark battle loop', 'toxic ambient battle', 'horror battle loop', 'ominous game loop'], minDur: 12, maxDur: 240 },
  { out: 'public/audio/sfx/enemy_death.ogg', queries: ['soft puff', 'whoosh short soft'], minDur: 0.05, maxDur: 3 },
  { out: 'public/audio/sfx/ui_click.ogg', queries: ['click soft', 'ui click'], minDur: 0.02, maxDur: 1.5 },
  { out: 'public/audio/sfx/ui_open.ogg', queries: ['whoosh open soft', 'swipe soft short', 'menu open'], minDur: 0.05, maxDur: 2 },
  { out: 'public/audio/sfx/ui_back.ogg', queries: ['whoosh back', 'cancel soft', 'ui back'], minDur: 0.05, maxDur: 2 },
  { out: 'public/audio/sfx/page_turn.ogg', queries: ['page turn', 'book page', 'paper flip'], minDur: 0.05, maxDur: 2.5 },
  { out: 'public/audio/sfx/almanac_select.ogg', queries: ['soft tick', 'select blip', 'ui confirm soft'], minDur: 0.02, maxDur: 1.5 },
  { out: 'public/audio/sfx/xp_collect.ogg', queries: ['coin soft', 'pickup chime soft', 'collect sparkle'], minDur: 0.05, maxDur: 2 },
  { out: 'public/audio/sfx/buff_appear.ogg', queries: ['level up soft', 'power up appear', 'magic rise soft'], minDur: 0.2, maxDur: 4 },
  { out: 'public/audio/sfx/buff_select.ogg', queries: ['confirm chime', 'select magic soft', 'upgrade select'], minDur: 0.1, maxDur: 3 },
  { out: 'public/audio/sfx/amulet_appear.ogg', queries: ['mystical chime', 'magic sparkle long', 'holy appear soft'], minDur: 0.3, maxDur: 5 },
  { out: 'public/audio/sfx/amulet_select.ogg', queries: ['magic confirm', 'enchant soft', 'crystal select'], minDur: 0.15, maxDur: 3.5 },
  { out: 'public/audio/sfx/meta_buy.ogg', queries: ['purchase coin', 'buy success', 'shop buy soft'], minDur: 0.1, maxDur: 2.5 },
  { out: 'public/audio/sfx/player_hurt.ogg', queries: ['hit soft', 'impact soft short'], minDur: 0.05, maxDur: 2.5 },
  { out: 'public/audio/sfx/potion_land.ogg', queries: ['splash soft', 'liquid splash'], minDur: 0.1, maxDur: 3.5 },
  { out: 'public/audio/sfx/boss_appear.ogg', queries: ['dramatic hit', 'sting short'], minDur: 0.2, maxDur: 6 },
  { out: 'public/audio/sfx/lightning.ogg', queries: ['thunder crack short', 'lightning strike', 'thunder clap short'], minDur: 0.15, maxDur: 4 },
  { out: 'public/audio/sfx/dog_bark.ogg', queries: ['dog bark short', 'dog bark single', 'puppy bark'], minDur: 0.1, maxDur: 3 },
  { out: 'public/audio/sfx/boss_roar.ogg', queries: ['monster roar short', 'beast roar', 'dramatic roar'], minDur: 0.3, maxDur: 4 },
  { out: 'public/audio/sfx/acrobat_land.ogg', queries: ['impact thud heavy', 'ground slam', 'heavy landing'], minDur: 0.15, maxDur: 3 },
  { out: 'public/audio/music/boss_acrobat.ogg', queries: ['action loop game', 'battle music loop', 'intense loop chiptune', 'electronic battle loop', 'fast battle loop'], minDur: 8, maxDur: 240 },
];

async function search(query, minDur, maxDur) {
  const filter = `license:"Creative Commons 0" duration:[${minDur} TO ${maxDur}]`;
  const url = new URL(`${API}/search/text/`);
  url.searchParams.set('query', query);
  url.searchParams.set('filter', filter);
  url.searchParams.set('fields', 'id,name,username,license,duration,previews,url');
  url.searchParams.set('page_size', '12');
  url.searchParams.set('token', TOKEN);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Search ${res.status}: ${body.slice(0, 240)}`);
  }
  const data = await res.json();
  return (data.results ?? []).filter(
    (r) => r.previews?.['preview-hq-ogg'] || r.previews?.['preview-hq-mp3'],
  );
}

async function downloadPreview(sound, destPath) {
  const ogg = sound.previews?.['preview-hq-ogg'];
  const mp3 = sound.previews?.['preview-hq-mp3'];
  const previewUrl = ogg || mp3;
  if (!previewUrl) throw new Error(`Sem preview: ${sound.id}`);

  let finalPath = destPath;
  if (!ogg && mp3) finalPath = destPath.replace(/\.ogg$/i, '.mp3');

  const abs = resolve(root, finalPath);
  mkdirSync(dirname(abs), { recursive: true });

  // Previews são URLs públicas; token ajuda se o CDN exigir
  const url = new URL(previewUrl);
  if (!url.searchParams.has('token')) url.searchParams.set('token', TOKEN);

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download preview ${sound.id}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(`Arquivo muito pequeno (${buf.length} B) — download inválido`);
  writeFileSync(abs, buf);
  return { path: finalPath, bytes: buf.length };
}

async function pickAndDownload(job) {
  const absPreferred = resolve(root, job.out);
  if (existsSync(absPreferred) && process.env.AUDIO_FORCE !== '1') {
    console.log(`= skip (já existe): ${job.out}`);
    return null;
  }

  let chosen = null;
  let usedQuery = '';
  let lastErr = null;
  for (const q of job.queries) {
    try {
      const results = await search(q, job.minDur, job.maxDur);
      await sleep(400);
      if (results.length) {
        chosen = results[0];
        usedQuery = q;
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`  ~ busca falhou (“${q}”): ${err.message ?? err}`);
      await sleep(600);
    }
  }
  if (!chosen) {
    console.warn(`! nada CC0 para ${job.out}${lastErr ? ` (último erro: ${lastErr.message})` : ''}`);
    return null;
  }

  const dl = await downloadPreview(chosen, job.out);
  console.log(`✓ ${dl.path} ← #${chosen.id} “${chosen.name}” (@${chosen.username}) [${usedQuery}] ${dl.bytes} B`);
  return {
    file: dl.path,
    id: chosen.id,
    name: chosen.name,
    username: chosen.username,
    license: chosen.license,
    url: chosen.url,
    query: usedQuery,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Freesound → public/audio/ (CC0 previews)\n');
  const credits = [];
  for (const job of JOBS) {
    try {
      const row = await pickAndDownload(job);
      if (row) credits.push(row);
    } catch (err) {
      console.error(`x ${job.out}:`, err.message ?? err);
    }
  }

  const creditsPath = resolve(root, 'public/audio/CREDITS.txt');
  const lines = [
    'Abolivion — áudio via Freesound (previews HQ)',
    'Licenças filtradas para Creative Commons 0 (domínio público).',
    'Fonte: https://freesound.org',
    '',
    ...credits.map(
      (c) =>
        `${c.file}\n  id=${c.id}  author=${c.username}  name=${c.name}\n  ${c.url}\n  license=${c.license}\n`,
    ),
  ];
  writeFileSync(creditsPath, lines.join('\n'), 'utf8');
  console.log(`\nCréditos: public/audio/CREDITS.txt (${credits.length} novos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
