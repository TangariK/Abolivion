# Abolivion

Roguelite top-down (estilo *Vampire Survivors*), feito com **TypeScript**, **Phaser 3** e **Vite**. Arte geométrica gerada em runtime — sem sprites externos no MVP.

**Jogue no navegador:** [Game Jolt — Abolivion](https://gamejolt.com/games/abolivion/1086828)

**Versão atual:** `0.1.0` (MVP) — ver [CHANGELOG](CHANGELOG.md) e [docs/versions/0.1.0.md](docs/versions/0.1.0.md)

---

## História

Você controla um pequeno índio em uma tribo abandonada. Toda noite, centenas de invasores tentam destruir sua cabana. Sobreviva o máximo que puder.

---

## Como jogar

| Controle | Ação |
|----------|------|
| **W A S D** | Movimento |
| **Mouse** | Mira (tiro automático) |

### Loop

1. Ande pelo mapa e elimine inimigos (eles te perseguem).
2. Colete orbs de **XP** → suba de nível → escolha **1 de 3 upgrades**.
3. Ao morrer, ganhe **moedas** e compre **melhorias permanentes** no menu.
4. Tente de novo.

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
    ├── scenes/             # Boot, Menu, Game, Upgrade, GameOver
    ├── entities/           # Player, Enemy, Projectile, XPOrb
    ├── systems/            # Input, Weapon, Spawn, Level
    ├── upgrades/           # Run upgrades + meta (localStorage)
    ├── utils/ShapeFactory.ts
    └── data/types.ts
```

---

## Publicar / atualizar na Game Jolt

1. `npm run build`
2. Zipar o **conteúdo** de `dist/` (o `index.html` deve ficar na **raiz** do zip — não zipar a pasta `dist` em si).
3. Em [Packages do jogo](https://gamejolt.com/games/abolivion/1086828) → Browser Build → **HTML**.
4. Dimensões do embed: **1280 × 720**.

Arquivo de referência já gerado localmente (não versionado): `abolivion-gamejolt.zip`.

### Campos úteis no cadastro

- **Engine / Language / Tool:** Phaser 3 / TypeScript / HTML5  
- **Partner system:** não é necessário para o MVP  

---

## Save / meta-progressão

Perfil salvo em `localStorage` (`abolivion_profile_v1`):

- Moedas  
- Níveis permanentes: Vitalidade, Agilidade, Força, Cadência  

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
