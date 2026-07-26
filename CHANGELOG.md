# Changelog

Todas as mudanças notáveis do **Abolivion** ficam registradas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR** (`1.0.0`) — mudanças que quebram saves, controles ou o loop principal  
- **MINOR** (`0.2.0`) — novas mecânicas / conteúdo compatível  
- **PATCH** (`0.1.1`) — incremento do Early Access; antes de `1.0.0` também pode incluir features

Documentação detalhada de cada release: [`docs/versions/`](docs/versions/).

---

## [Unreleased]

_Mudanças em desenvolvimento, ainda sem número de versão._

---

## [0.1.1] — 2026-07-25

### Adicionado

- Pausa por `Esc`, com opções de continuar ou voltar ao menu
- Escolha adicional de amuleto a cada 5 níveis
- Cinco amuletos: Olhos de Araci, Garras de Jaci, Círculo de Anhangá, Sopro de Tupã e Dente de Guará
- Insígnias douradas no HUD para os amuletos obtidos na run
- Marã, almanaque com registros de Amuletos, Melhorias e Inimigos
- Descobertas persistentes no `localStorage`; itens desconhecidos aparecem como `???`
- Cachorro espiritual representado por uma esfera cinza que caça inimigos aleatórios

### Alterado

- Todo nível continua oferecendo uma melhoria normal; níveis 5, 10, 15… oferecem também um amuleto
- Pool de projéteis ampliado de 120 para 240 para suportar os padrões de tiro múltiplo
- Save interno atualizado para schema v2 com migração automática do perfil v1
- Build de produção agora emite IIFE (`game.js`) sem `type="module"`, corrigindo tela preta na Game Jolt

### Detalhamento

Ver snapshot completo em [`docs/versions/0.1.1.md`](docs/versions/0.1.1.md).

---

## [0.1.0] — 2026-07-25

### Adicionado

- MVP jogável de roguelite top-down (Phaser 3 + TypeScript + Vite)
- Movimento WASD, mira no mouse e tiro automático
- Mapa único com cabana central e arte geométrica gerada em runtime
- 3 tipos de inimigos: rápido, normal e tanque
- Spawn crescente com o tempo de sobrevivência
- Sistema de XP, level-up e escolha entre 3 upgrades por nível
- HUD com barras de HP e XP
- Game over com moedas e retorno ao menu / retry
- Meta-progressão permanente (Vitalidade, Agilidade, Força, Cadência) via `localStorage`
- Build HTML5 com `base: './'` pronto para Game Jolt
- Publicação inicial: [Game Jolt](https://gamejolt.com/games/abolivion/1086828)

### Detalhamento

Ver snapshot completo em [`docs/versions/0.1.0.md`](docs/versions/0.1.0.md).

---

[Unreleased]: https://github.com/TangariK/Abolivion/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/TangariK/Abolivion/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TangariK/Abolivion/releases/tag/v0.1.0
