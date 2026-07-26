# Abolivion

Roguelite top-down (estilo *Vampire Survivors*), feito com **TypeScript**, **Phaser 3** e **Vite**. Arte geométrica gerada em runtime — sem sprites externos no MVP.

**Jogue no navegador:** [Game Jolt — Abolivion](https://gamejolt.com/games/abolivion/1086828)

**Versão atual:** `0.1.4` — ver [CHANGELOG](CHANGELOG.md) e [docs/versions/0.1.4.md](docs/versions/0.1.4.md)

---

## História

Você controla um pequeno índio em uma tribo abandonada. Toda noite, centenas de invasores tentam destruir sua cabana. Sobreviva o máximo que puder.

---

## Como jogar

| Controle | Ação |
|----------|------|
| **W A S D** / **Setas** | Movimento (1P) |
| **Mouse** | Mira (1P) |
| **Esc** | Pausar / continuar |
| **2P — P1** | WASD move · IJKL mira |
| **2P — P2** | Setas move · Mouse mira |

### Loop

1. Escolha o **modo** (Infinito, Rodadas ou Livre; História em breve).
2. Ande pelo mapa e elimine inimigos (eles te perseguem).
3. Colete orbs de **XP** → suba de nível → escolha **1 de 3 upgrades**.
4. A cada 5 níveis, escolha também um **Amuleto** (com raridade em luas).
5. Ao morrer, ganhe **moedas** e compre **melhorias permanentes** no menu (exceto no Modo Livre).
6. Consulte descobertas e conquistas no **Marã**.
7. Tente de novo. Opcional: crie uma **conta** no perfil para não perder o progresso.

### Inimigos (MVP)

- **Rápido** — pouca vida, alta velocidade  
- **Normal** — equilibrado  
- **Tanque** — muita vida, lento  

---

## Stack

- TypeScript  
- Phaser 3  
- Vite  
- npm  

Nada além disso.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run preview` | Preview do build |
| `npm run db:migrate` | Aplica schema Abolivion no Postgres (Supabase) |
| `npm run pack:gamejolt` | Build + zip para upload no Game Jolt |

### Conta (opcional)

Crie um `.env` a partir de `.env.example` com a URL do projeto e a **anon/publishable key** (`VITE_SUPABASE_ANON_KEY`).
Sem a chave, o jogo roda normal, mas login fica desativado.

**Não** use prefixo `VITE_` em secret/service keys (`sb_secret_…`) — o Vite embute `VITE_*` no bundle do navegador.

MCP do projeto: `.cursor/mcp.json` → servidor `supabase-abolivion` (escopado ao project ref do Abolivion).

#### Configuração do Auth (Supabase → Authentication → Providers → Email)

| Setting | Valor | Motivo |
|---------|-------|--------|
| Confirm email | **OFF** | O cadastro nasce com e-mail sintético `usuario@guest.abolivion.app`; o jogador entra na hora |
| Secure email change | **OFF** | O link de confirmação vai só para o **novo** endereço (o antigo é o sintético, que não existe) |

O e-mail é opcional: quem informa um recebe o link de confirmação pela Edge Function
`attach-email` (Admin `generateLink` + API Brevo). Isso **não** usa o SMTP do GoTrue —
evita o bug em que o envio para `@guest.abolivion.app` reverte a troca inteira.

#### E-mail via Brevo (Edge Function)

As keys `BREVO_API_KEY` / `BREVO_MCP_KEY` no `.env` local **não** alimentam o jogo nem o
dashboard. O envio de confirmação usa secrets da Edge Function.

1. No Brevo → **Security → Authorised IPs**: desative a restrição de IP (senão a API
   responde 401 e nada é enviado — inclusive da Edge Function na nuvem).
2. Confirme um remetente em **Senders** (pode ser seu Gmail no Early Access).
3. Defina os secrets e faça o deploy:

```bash
npx supabase login
# no .env: BREVO_API_KEY + BREVO_SENDER (remetente verificado)
npm run functions:deploy
```

#### SMTP do Auth (opcional — reset de senha)

O SMTP em **Authentication → SMTP Settings** ainda serve para e-mails que o GoTrue
manda sozinho (ex.: recovery). Use a **SMTP key** do Brevo (aba SMTP), **não** a API key:

| Campo | Valor |
|-------|-------|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | e-mail da conta Brevo |
| Password | SMTP key (não é a API key `xkeysib-...`) |
| Sender email | remetente **verificado** no Brevo |
| Sender name | `Abolivion` |

> Misturar API key no campo Password do SMTP é a causa mais comum de
> `Error sending email change email` sem o e-mail chegar.

Templates institucionais do jogo (confirmação, troca de e-mail, reset de senha):
`supabase/email-templates/` — cole no dashboard em
[Authentication → Email Templates](https://supabase.com/dashboard/project/rjhwjhfrrmwwqmkpyupc/auth/templates).

### Conta de dev (admin)

Rodando local (`npm run dev`), a Visão de Dev já fica disponível no perfil.
Para valer também em produção, marque sua conta no banco (uma vez, após o primeiro login):

```sql
update public.abolivion_profiles set role = 'admin' where username = 'seu_usuario';
```

O cliente não consegue alterar `role` (grant de coluna bloqueado); só via SQL/dashboard.

---

## Estrutura do projeto

```
Abolivion/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts          # base: './' (necessário para Game Jolt)
├── public/                 # assets estáticos (reservado para sons)
└── src/
    ├── main.ts
    ├── config/GameConfig.ts
    ├── scenes/             # Boot, Menu, Game, Upgrade, Pause, Almanac, GameOver
    ├── entities/           # Player, Enemy, Projectile, XPOrb, DogCompanion
    ├── systems/            # Input, Weapon, Spawn, Level
    ├── upgrades/           # Run upgrades + meta (localStorage)
    ├── utils/ShapeFactory.ts
    └── data/types.ts
```

---

## Publicar / atualizar na Game Jolt

1. `npm run pack:gamejolt` (ou `npm run build` e zipar o **conteúdo** de `dist/`)
2. Em [Packages do jogo](https://gamejolt.com/games/abolivion/1086828) → Browser Build → **HTML**.
3. Dimensões do embed: **1280 × 720**.

O build de produção usa um script clássico IIFE (`game.js`), não ES modules — necessário para o iframe da Game Jolt.

Arquivo gerado (não versionado): `abolivion-v{versão}-gamejolt.zip` (ex.: `abolivion-v0.1.2-gamejolt.zip`).

### Campos úteis no cadastro

- **Engine / Language / Tool:** Phaser 3 / TypeScript / HTML5  
- **Partner system:** não é necessário para o MVP  

---

## Save / meta-progressão

Perfil salvo em `localStorage` (`abolivion_profile_v1`):

- Moedas  
- Níveis permanentes: Vitalidade, Agilidade, Força, Cadência  
- Descobertas do Marã: amuletos, melhorias, inimigos, chefões e conquistas

O schema interno v3 migra automaticamente saves das versões anteriores.

---

## Roadmap possível (pós-MVP)

- Sons / música  
- Bosses  
- Mais armas e upgrades  
- Feedback visual (partículas, floating damage)  
- Capas e screenshots melhores na página da Game Jolt  

---

## Licença

Projeto pessoal — ajuste a licença conforme preferir ao publicar o repositório.
