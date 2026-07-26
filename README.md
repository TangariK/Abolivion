# Abolivion

Roguelite top-down (estilo *Vampire Survivors*), feito com **TypeScript**, **Phaser 3** e **Vite**. Arte geométrica gerada em runtime — sem sprites externos no MVP.

**Jogue no navegador:** [Game Jolt — Abolivion](https://gamejolt.com/games/abolivion/1086828)

**Versão atual:** `0.1.3` — ver [CHANGELOG](CHANGELOG.md) e [docs/versions/0.1.3.md](docs/versions/0.1.3.md)

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

1. Escolha o **modo** (Infinito ou Rodadas; História em breve).
2. Ande pelo mapa e elimine inimigos (eles te perseguem).
3. Colete orbs de **XP** → suba de nível → escolha **1 de 3 upgrades**.
4. A cada 5 níveis, escolha também um **Amuleto** (com raridade em luas).
5. Ao morrer, ganhe **moedas** e compre **melhorias permanentes** no menu.
6. Consulte descobertas e conquistas no **Marã**.
7. Tente de novo.

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
