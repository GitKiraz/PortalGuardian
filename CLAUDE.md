@AGENTS.md

# Portal Guardian Mauá

Portal da entidade de Segurança da Informação Guardian Mauá (Instituto Mauá de Tecnologia). Interface, textos e comentários em **português (pt-BR)**. Veja o README para funcionalidades e setup.

## Stack e comandos

- Next.js 16 App Router, React 19, Tailwind 4, Prisma 7 (`prisma-client` generator → `src/generated/prisma`, adapter `@prisma/adapter-pg`), PostgreSQL e LiveKit via `docker compose`.
- `npm run services` sobe Postgres e LiveKit. Use `npm run dev`, `npm run typecheck` e `npx eslint src`.
- Após mudar o schema: `npx prisma migrate dev --name <nome>` e depois `npx prisma generate` (o Prisma 7 **não** gera o client no migrate).
- Next 16: `middleware` virou `src/proxy.ts`; `params`, `searchParams` e `cookies()` são assíncronos; use os helpers globais `PageProps<"/rota">`, `LayoutProps` e `RouteContext`.

## Decisões de arquitetura

- **Áreas são registros no banco** (model `Area`), não enum. A entidade vai abrir novas frentes (Serviços, Competições, Simulação, Soluções), que o admin cria em /coordenacao/areas. `isGlobal` marca áreas abertas a todos (Registro).
- **Permissões** centralizadas em `src/lib/permissions.ts`. Admin = DEV, PRESIDENTE, VICE_PRESIDENTE. Coordenador = `role COORDENADOR` + `Area.coordinatorId` (único por área). Pleno acessa uma área não global só se for `AreaMember`.
- **Promoção a Pleno** exige aprovação: concluir cursos com `requiredForPleno` cria um `PromotionRequest` PENDENTE, e a coordenação aprova no painel.
- **Cadastro** cria usuário PENDENTE/JUNIOR; a coordenação aprova.
- **Sessão**: token aleatório em cookie httpOnly, com sha256 guardado na tabela `Session`. `getCurrentUser()` usa `cache()` por request. Páginas usam `requireUser`/`requireCoordination`/`requireAdmin`; server actions revalidam permissão sempre.
- **Salas** (`Room`): projeto, reunião ou coordenação. O chat persiste em `Message` e é transmitido via SSE (`/api/rooms/[id]/stream`) com EventEmitter em memória (uma instância). Voz e tela usam LiveKit; o nome da sala LiveKit é o `Room.id`, e o token sai de `/api/rooms/[id]/token`.
- **Arquivos** ficam em `UPLOAD_DIR` com nome UUID. O download passa por `/api/files/[id]` com checagem de acesso e só é exibido inline para tipos seguros.
- **Formulários dinâmicos** (eventos e processo seletivo): JSON `FormField[]` editado no `FormBuilder`, validado em `src/lib/forms.ts`.
- Server actions que retornam `{error|success}` usam `<ActionForm>`; ações simples usam `<form action={acao.bind(null, id)}>` + `<SubmitButton>`. Após mutações, chamar `refreshPortal()`.
- Datas `@db.Date` são meia-noite UTC (`parseDateInput`/`formatDate`); datetime-local é interpretado como horário de Brasília (`parseDateTimeInput`).

## Identidade visual

- Fonte oficial: `/home/akira/Documents/IdentidadeGuardian/` (PDF da Teia Criativa + `logo4.jpeg`). Cores: roxo `#b41cb8`, preto `#191717`, branco `#ffffff`. Tipografia das peças: Poppins (`font-display`).
- Tokens em `src/app/globals.css`: use `bg-accent`/`border-accent` para preenchimentos e `text-accent-text` (roxo clareado) para texto sobre fundo escuro — o roxo puro não passa contraste AA em texto pequeno. Não use cores `cyan`/`slate`.
- Ícone vetorizado a partir da logo4 em `src/components/GuardianLogo.tsx` (mesma geometria em `src/app/icon.svg`); wordmark com pingo do i roxo em `src/components/Brand.tsx`.

## Padrões de UX (seguir em telas novas)

- Senhas: sempre `PasswordInput` (olhinho + aviso de Caps Lock); criação/troca de senha usa `NewPasswordFields` (confirmação com validação nativa + checagem no servidor); senha definida por admin usa `TemporaryPasswordInput`.
- `ActionForm`: mostra carregamento no botão clicado, anuncia erro/sucesso (`role=alert/status`); ações destrutivas usam `data-confirm="..."` no botão; `successView` para substituir o formulário após envio.
- Botões só com ícone: ícones do `lucide-react` com `aria-label` (em `SubmitButton`, use `icon` + `label`). Nada de emoji/símbolos como ícone.
- Todo campo precisa de rótulo (`Field` ou `aria-label`); marque campos não obrigatórios com "(opcional)".
- Contagens com `plural()` de `src/lib/format.ts` ("1 membro" / "2 membros").
- Páginas dinâmicas definem `generateMetadata` (título da aba) respeitando as mesmas permissões da página.
- Alinhamento: `html { scrollbar-gutter: stable }` evita que o conteúdo pule entre páginas curtas/longas; o conteúdo do portal fica alinhado ao menu (`max-w-7xl`, sem `mx-auto`). Não centralize o conteúdo no espaço ao lado do menu.

## Segurança, SEO e performance (manter ao mexer)

- **CSP com nonce** em `src/proxy.ts` (script-src `'strict-dynamic'`): toda página precisa ser dinâmica (página estática não recebe nonce e tem os scripts bloqueados; por isso `not-found.tsx` chama `connection()`). Domínio externo novo (iframe, imagem, websocket) precisa entrar na CSP. Demais cabeçalhos em `next.config.ts`.
- **Nada de zod (ou lib pesada) em componente cliente**: o zod 4 testa `new Function` e dispara violação de CSP. Constantes compartilhadas ficam em módulos sem dependências (ex.: `src/lib/form-fields.ts`).
- **Rate limit** em memória (`src/lib/rate-limit.ts`): login (só erros, por email e IP), cadastro, inscrição pública e chat. Formulários públicos novos devem usar. Limites de IP são folgados porque o campus sai por NAT.
- Redirecionamentos com destino vindo do usuário passam por validação de caminho interno (ver `safeRedirectPath` em `(auth)/actions.ts`).
- CSV: `csvResponse` neutraliza injeção de fórmula; sempre exporte por ele.
- Área logada tem `noindex` (layout do portal). Páginas públicas definem `description`, `alternates.canonical` e Open Graph; imagens OG são geradas com `OgCard` (`next/og`). `SITE_URL` alimenta `metadataBase`, sitemap e robots.
- Vídeos do YouTube: use `YouTubePlayer` (capa + player só ao clicar), nunca `<iframe>` direto.
- Fontes: só pesos/subsets usados (Poppins 600 latin). Fonte usada em toda página (inclusive Geist Mono do `Brand`) mantém preload.

## Pendências / ideias

- Rate limit e barramento do chat são em memória: para mais de uma instância, trocar por Redis/Postgres.
- Revogação imediata: aluno removido de projeto continua com o SSE aberto e o token LiveKit (6h) até reconectar.

- Notificações por email (aprovação de cadastro, processo seletivo) ainda não existem.
- Configuração de produção do LiveKit (chaves, TLS) não está feita; veja o README.
