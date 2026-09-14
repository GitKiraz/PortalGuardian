# Portal Guardian Mauá

Portal web da **Guardian Mauá**, a entidade de Segurança da Informação do Instituto Mauá de Tecnologia.

## Funcionalidades

- **Capacitação**: vídeo aulas do YouTube com progresso por aula. Quando um Junior conclui os cursos marcados como **requisito para virar Pleno** (Capacitação 1 - Web Exploit), é gerada uma solicitação de promoção a **Pleno** que a coordenação aprova.
- **Áreas** (Registro, Pesquisa, Oficina, NSPi, e outras que forem criadas): cada área tem projetos, reuniões e integrantes. O Registro é global e aberto a todos os alunos. As demais exigem ser Pleno e integrar a área.
- **Projetos**: chat em tempo real, chamada de voz com câmera e compartilhamento de tela (LiveKit), envio de arquivos, integrantes, líderes e link do repositório no GitHub.
- **Banco de horas**: cada aluno registra suas horas, que alimentam a planilha da coordenação.
- **Eventos**: formulários de presença (festa junina, CTF Night, encontros presenciais) com perguntas personalizadas e limite de vagas.
- **Módulo da Coordenação**:
  - painel de aprovações (cadastros e promoções a Pleno)
  - sala permanente de voz e texto, e reuniões com sala própria
  - planilha de horas com filtros, validação e exportação CSV
  - planilha financeira com saldo acumulado e exportação CSV
  - criação de eventos e formulários de presença
  - processos seletivos: fase 1 com formulário público e fase 2 com encontro presencial
  - gestão de membros, cargos, capacitação e áreas

### Cargos

| Cargo | Acesso |
| --- | --- |
| Dev | Tudo. É o único que pode conceder o cargo Dev |
| Presidente / Vice-presidente | Todas as áreas e todo o módulo da Coordenação, incluindo cargos e áreas |
| Coordenador(a) | Módulo da Coordenação e gestão da própria área (1 coordenador por área) |
| Pleno | Registro e as áreas das quais é integrante |
| Junior | Registro, capacitação, banco de horas e eventos |

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma 7 com PostgreSQL 17, LiveKit (WebRTC) e Server-Sent Events para o chat.

## Rodando localmente

Requisitos: Node.js 20 ou mais recente, Docker e Docker Compose.

```bash
cp .env.example .env          # ajuste SEED_DEV_EMAIL e SEED_DEV_PASSWORD
npm install
npm run services              # sobe PostgreSQL e LiveKit
npm run db:deploy             # aplica as migrações
npm run db:seed               # cria a conta Dev, as 4 áreas, a sala da coordenação e o curso
npm run dev
```

Acesse http://localhost:3000 e entre com a conta Dev definida no `.env`. **Troque a senha em "Meu perfil".**

Depois, em **Gerenciar capacitação**, adicione as vídeo aulas da Capacitação 1 - Web Exploit.

### Dev Container

Requisitos: Docker e VS Code com a extensão Dev Containers (ou a CLI `@devcontainers/cli`).

1. Abra a pasta no VS Code e escolha **Dev Containers: Reopen in Container**.
2. O `initializeCommand` sobe Postgres e LiveKit no host. O container usa a rede do host e, ao ser criado, instala as dependências, aplica as migrações e roda o seed.
3. Rode `npm run dev` **dentro** do container. Antes, pare o `npm run dev` do host, porque os dois compartilham a pasta `.next`.

**Histórico do Claude Code:** o container monta `~/.claude` e `~/.claude.json` do host e usa o mesmo caminho absoluto do projeto. Assim, `claude --resume` (ou o histórico da extensão) mostra as conversas anteriores deste projeto. Esses arquivos precisam existir no host, então use o Claude Code no host pelo menos uma vez antes de criar o container.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run db:migrate` | Cria uma migração após alterar `prisma/schema.prisma` |
| `npm run db:studio` | Interface visual do banco |

## Produção

- **HTTPS é obrigatório** para microfone, câmera e compartilhamento de tela, pois os navegadores bloqueiam essas APIs fora de `localhost`. Coloque o portal atrás de um proxy reverso com TLS (Caddy, Nginx ou Traefik).
- **LiveKit**: o `docker-compose.yml` roda em modo `--dev`, com chaves públicas `devkey`/`secret`. Em produção:
  - gere chaves próprias com um arquivo `livekit.yaml` e preencha `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`;
  - exponha o LiveKit via `wss://` e defina `LIVEKIT_URL` (ex.: `wss://voz.seudominio.com`);
  - libere as portas 7881/tcp e 7882/udp no firewall.
  - Guia: https://docs.livekit.io/home/self-hosting/deployment/
- `COOKIE_SECURE="true"` quando o portal estiver em HTTPS.
- Faça backup do volume do Postgres e da pasta `UPLOAD_DIR`, onde ficam os arquivos dos projetos.
- O chat usa um barramento em memória, então rode **uma única instância** do servidor Next. Para escalar horizontalmente, troque `src/lib/realtime.ts` por Postgres LISTEN/NOTIFY ou Redis.

## Estrutura

```
prisma/schema.prisma        modelo de dados
prisma/seed.ts              dados iniciais
src/proxy.ts                redireciona para /login sem sessão
src/lib/permissions.ts      regras de acesso por cargo e área
src/lib/auth.ts             sessão (cookie httpOnly + tabela Session)
src/app/(auth)              login e cadastro
src/app/(portal)            portal logado (áreas, projetos, horas, eventos, coordenação)
src/app/processo-seletivo   formulário público de inscrição
src/app/api                 chat (SSE), token LiveKit, arquivos e exportações CSV
```
