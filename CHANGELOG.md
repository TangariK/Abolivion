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

---

## [0.1.8] — 2026-07-29

### Adicionado

- Hub do menu: **Loja da Tribo** (Resina) e **Cabana do Pajé** (permanentes / emblemas / Arsenal / Ritos)
- Moeda **Resina**; emblemas com efeitos ativos (Ninhada→loja+drops, Olhar→reroll, Matilha→corrida/stamina, Frasco→Marã analítico, Salto→Arsenal, Couraça→Clã)
- Rodada 60: variantes blindadas, **Escudeiro**, chefão **Mestre do Escudo** + 4 cavaleiros + Emblema da Couraça
- Escudo visual na fase de defesa do Mestre; admin pode **Liberar** emblemas na Cabana
- Online: bosses/torretas no guest via snapshot; `firing` do guest; validação de peer/role nas mensagens
- Salas: RLS só host muta (+ RPC guest-host); sync cloud LWW para moedas/meta/resina

### Corrigido / Ajustado

- Cache de profile e HUD dirty (menos `localStorage`/redesenho por frame)
- Removido `seed` do protocolo online (guest não simula spawn)
- Mestre do Escudo: dano na armadura (escudo só na defesa), cavaleiros mais fortes, corrida com overshoot, HUD (stamina vs texto), Clã relê emblema no clique

### Adiado (próximas sessões)

- Itens da Loja da Tribo; conteúdo do Arsenal / Ritos; Clã social; anti-cheat server-side completo; otimização profunda de snapshot

---

## [0.1.7] — 2026-07-28

### Adicionado

- Dificuldade: IA de cerco no Infinito/Rodadas; mais inimigos na tela; spawns próximos com o tempo
- Inimigos: Apunhalador, 4 Camuflados, Entorpecedor e Bruto Entorpecedor; **NV2** (rodada 40+ / ~10 min Infinito)
- Status **Letargia** e **Tontura**; HUD de status com timer e barra
- **Triggered Mode** em todos os chefões (metade da vida): grito, shake, poder extra + label TRIGGERED
- Boitatá: torretas destrutíveis (até 4, algumas atrás do player) + dano ao encostar
- Envenenador: névoa/rastro, poções nas costas do player, volley em círculo no Triggered
- 5º chefão: **Acrobata da Clareira** (rodada 50) com música e saltos em área
- Emblemas dropados por chefões + aba no Marã; XP de boss bem maior (orb grande)
- Meta **Sabedoria Ancestral**; buffs Seiva/Ligadura; amuleto Véu de Cura
- **Mural da Tribo** (filtros por rodada/tempo/abates/nível) + privacidade Público/Anônimo/Invisível
- Modo Livre: templates nomeados (salvar / abrir / sobrescrever)
- Volume de música/efeitos na tela de pausa

### Corrigido / Ajustado

- Crash de áudio no level-up e freeze no Modo Livre (WaveSystem reutilizado)
- Contato/tiro, XP limbo, Kurupi dash, flanco sem zigue-zague
- Balanceamento progressivo dos chefões; HUD de torretas/amuletos
- Loja de metas recentralizada; Marã sem overflow no painel de detalhe
- Mural: cast de milissegundos fracionários no ranking

### Detalhamento

Ver [`docs/versions/0.1.7.md`](docs/versions/0.1.7.md).

---

## [0.1.6] — 2026-07-27

### Adicionado

- Sistema de som (menu ♪: volume / ligar-desligar música e efeitos); arquivos em `public/audio/`
- SFX em perfil, Marã, dropdowns, pause, meta-shop, XP, buffs, amuletos; latido (Guará) e trovão ao despertar Tempestade de Tupã
- Música por chefão (Kurupi, Boitatá, Lobo Rei, Envenenador) + duck da música no pause
- Chefões: Lobo Rei (rodada 30), Envenenador Master (rodada 40)

### Corrigido

- Começar não trava após fechar dropdown de modo (blocker fullscreen)
- Começar não fica morto após Modo Livre / overlays HTML (`input.enabled` reativado)
- Overlap menu+jogo ao voltar pelo pause
- Livre custom: barra de HP do chefão; BGM do boss mais forte selecionado
- Lobo Rei mais agressivo (esquiva lateral sem se afastar); Envenenador com maior alcance de poção

### Detalhamento

Ver [`docs/versions/0.1.6.md`](docs/versions/0.1.6.md).

---

## [0.1.5] — 2026-07-26

### Adicionado

- Modo **Online** 2P: criar/buscar salas (públicas/privadas), link `?sala=`, lobby e countdown
- Sync host-autoritativo (Supabase Realtime); convidados com nomes de árvore
- Luz dourada na escolha de upgrade/amuleto no online; espectar / sair ao morrer
- Amuletos: Presas de Jurupari (esquerda/direita), Meia-Lua de Jaci, Misericórdia de Anhangá,
  Vigília de Iara (canal sobre aliado caído)
- Inimigos: Envenenador e Lobos do Mal (3 variantes) com veneno/sangramento
- HUD de status (Veneno / Sangramento) no canto superior
- 5 conquistas exclusivas do online

### Corrigido

- Seletor de jogadores como dropdown; duas cabanas em 2P
- Controles online (WASD+mouse no personagem local); tiro/mira após morte do aliado
- Nome do host no convidado; proteção de escolha / tiro após upgrade
- Game Over online: não oferece “Tentar de novo” sem sala (volta ao menu); evita lobby preso sem sessão

### Detalhamento

Ver [`docs/versions/0.1.5.md`](docs/versions/0.1.5.md).

---

## [0.1.4] — 2026-07-26

### Adicionado

- Conta cloud via Supabase (cadastro / login / logout) no botão de perfil do menu
- Cadastro com usuário e senha; e-mail opcional com confirmação via Edge Function + Brevo
  (reenvio, adicionar/trocar e-mail, recuperação de senha; não bloqueia o acesso)
- Aviso de progresso em cache quando o jogador está como convidado
- Sync de perfil (`abolivion_profiles`) com RLS
- Perfil logado: Informações básicas, Opções, Legado (stats) e painel Dev (admin)
- Modo Livre: setup customizado (nível, buffs, amuletos, rodada/tempo, inimigos, chefões);
  sem moedas/unlocks; conquistas exclusivas do modo
- Quatro tiers de conquistas: Normal, Secreta, Tribal e Ancestral
- Novas conquistas (comuns, secretas da ninhada do Kurupi, tribal, ancestral e do Modo Livre)
- Conquista Nome na Tribo ao autenticar
- Timer de sobrevivência formatado (`45s` / `1m 5s` / `1h 2m 3s`) e scroll com máscara no Marã

### Corrigido

- Sync de conta: o cache de **convidado** do navegador não é mais misturado na conta ao logar
  (evita Marã/legado de outro save local sobrescrever a nuvem). Saves de convidado e de conta
  ficam em slots separados no `localStorage`.

### Detalhamento

Ver [`docs/versions/0.1.4.md`](docs/versions/0.1.4.md).

---

## [0.1.3] — 2026-07-25

### Adicionado

- Seletor 1/2 jogadores no menu, com aviso de controles no modo coop
- Coop local: P1 WASD+IJKL, P2 setas com mira automática
- Amuleto Eco de Caipora (☽): tiro para trás
- Amuleto Tempestade de Tupã (☽☽☽☽): raios aleatórios de alto dano
- Conquistas Parceiros da Noite e Tocado pela Tempestade
- Card lateral ao desbloquear conquista durante a run

### Detalhamento

Ver [`docs/versions/0.1.3.md`](docs/versions/0.1.3.md).

---

## [0.1.2] — 2026-07-25

### Adicionado

- Seleção de modo no menu: Infinito, Rodadas e História (bloqueada)
- Modo Rodadas com barra de inimigos, pausa de 5s e progressão
- Chefões: Kurupi da Ninhada (rodada 10) e Boitatá do Olhar (rodada 20)
- Inimigos: Blindado, Sombra Ligeira e Quebra-Ossos
- Amuletos: Lágrima de Iara (regen) e Espinhos da Cuca (thorns), ambos ☽☽☽
- Sistema de raridade de amuletos em luas (1–5) com sorteio ponderado
- Buffs: Chamado da Clareira (raio de XP) e Colheita Abundante (+XP)
- Movimento também com setas do teclado
- Marã: abas Chefões e Conquistas, detalhe ao clicar com imagem
- 7 conquistas persistentes
- Zip Game Jolt com versão no nome (`abolivion-vX.Y.Z-gamejolt.zip`)

### Alterado

- Save interno v3 com bosses e achievements (migração automática)
- Amuletos existentes receberam raridade em luas

### Detalhamento

Ver [`docs/versions/0.1.2.md`](docs/versions/0.1.2.md).

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

[Unreleased]: https://github.com/TangariK/Abolivion/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/TangariK/Abolivion/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/TangariK/Abolivion/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/TangariK/Abolivion/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TangariK/Abolivion/releases/tag/v0.1.0
