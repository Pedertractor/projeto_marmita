# Segurança da Marmita

Este documento descreve, em linguagem técnica mas acessível, como a Marmita protege contas, pedidos e dados corporativos. Serve tanto para quem opera o sistema quanto para quem precisa auditar ou reforçar o ambiente.

Se você encontrou uma falha, veja a seção [Como reportar uma vulnerabilidade](#como-reportar-uma-vulnerabilidade) no final.

---

## Visão geral e modelo de ameaças

A Marmita é um sistema interno de solicitação de refeições com quatro papéis: **SUPER_ADMIN**, **RH**, **RESTAURANT** e **REQUESTER**. O front (React/Vite) fala com uma API Fastify, que persiste em PostgreSQL e integra com a base corporativa de colaboradores.

O que assumimos como ameaça realista:

- Alguém tentando adivinhar senha ou código de e-mail em massa
- Um usuário autenticado tentando ver ou alterar dados de outro (IDOR)
- RH tentando elevar privilégios ou mexer em SUPER_ADMIN
- Abuso de endpoints públicos (cadastro, reset de senha, validação de cartão)
- Sessão roubada após troca ou reset de senha
- Exposição acidental do banco ou de segredos no deploy

Não cobrimos aqui ameaças físicas ao servidor, engenharia social fora do app, nem o interior da API corporativa — só a superfície que este repositório controla.

---

## Autenticação e sessão

### JWT Bearer

Após o login, a API devolve um JWT assinado com **HS256** (`JWT_SECRET`, mínimo 32 caracteres). O front guarda o token em `localStorage` e envia `Authorization: Bearer …` em cada chamada.

Por que não cookie HttpOnly hoje? Foi uma decisão consciente: migrar exigiria CORS com credentials e proteção CSRF. Em troca, endurecemos a sessão de outras formas (abaixo) e aplicamos CSP no nginx do front. O risco residual é: se houver XSS no origin do front, o script pode ler o token. Por isso a CSP e a ausência de `dangerouslySetInnerHTML` importam.

### `tokenVersion` (revogação)

Cada usuário tem um inteiro `tokenVersion` no banco. O claim `tv` vai dentro do JWT. Em **toda** requisição autenticada o middleware:

1. valida a assinatura e a expiração do JWT;
2. carrega o usuário no banco (`active`, papel, empresa, desafios);
3. compara `tv` do token com `tokenVersion` do banco.

Se não bater, a sessão morre com 401 (“Sessão expirada”).

A versão sobe quando:

- o usuário troca a senha no primeiro login;
- completa um reset self-service (magic link);
- o admin reseta a senha;
- a conta é desativada;
- o papel do usuário muda.

Na troca de senha do primeiro login a API devolve um **novo** token já com o `tv` atualizado, para a sessão não quebrar na hora.

### Expiração

`JWT_EXPIRES_IN` (padrão `12h`) continua valendo. Em produção, `8h`–`12h` é o intervalo recomendado. Tokens antigos sem claim `tv` são tratados como versão `0` — ainda funcionam até a primeira invalidação, desde que o usuário esteja em `tokenVersion = 0`.

### Papel sempre vem do banco

O payload JWT pode carregar um `role` legado, mas o middleware **ignora** e usa o papel atual do banco. Desativar a conta ou a empresa também corta o acesso na hora seguinte request.

### Troca obrigatória de senha e verificação de e-mail

- Contas criadas pelo admin entram com `mustChangePassword = true`. Enquanto isso, só `/users/me` e `/users/me/change-password` passam.
- Solicitantes passam por desafio periódico de e-mail (código de 6 dígitos). Sem verificar, o resto da API responde 403.

---

## Senhas temporárias (decisão de negócio)

A regra atual é deliberada e permanece:

| Tipo de usuário | Senha temporária |
| --- | --- |
| Colaborador (cartão Pedertractor/Tractor) | o próprio número do cartão |
| Externo / criação por e-mail | `marmita123` |

Isso facilita o onboarding no chão de fábrica. As camadas que cercam o risco:

1. `mustChangePassword` obriga a troca no primeiro acesso — o middleware bloqueia o restante da API.
2. Login tem limite por IP **e** por conta (ver rate limit).
3. Reset pelo admin devolve a mesma regra, mas sobe `tokenVersion` e de novo exige troca.
4. A senha é hasheada com **bcrypt custo 12** — o valor em claro nunca fica no banco.

**Risco residual (honesto):** quem conhece o número do cartão (semi-público no ambiente) pode tentar login antes da primeira troca. Mitigações operacionais: orientar a troca imediata, manter rate limit ativo e não reutilizar cartões óbvios em ambientes compartilhados. Se no futuro a política mudar para senha aleatória mostrada uma vez ao RH, o ponto de troca é `temporaryPasswordForUser` / `EXTERNAL_TEMPORARY_PASSWORD` no back-end.

---

## Autorização por papel e dono do recurso

### Matriz resumida

| Área | SUPER_ADMIN | RH | RESTAURANT | REQUESTER |
| --- | --- | --- | --- | --- |
| Usuários | total | cria/edita (não mexe em SUPER_ADMIN) | — | próprio perfil |
| Empresas | cria/edita | só ativa/desativa | — | — |
| Cardápio | sim | — | do seu restaurante | leitura |
| Pedidos | visão ampla | visão RH + especiais | do seu restaurante | só os próprios |
| Relatórios / audit | sim | relatórios | dashboard restaurante | — |
| Cadastro público | — | aprova/rejeita | — | solicita |

O front tem `roleAccess.ts` / `ProtectedRoute` só para UX. **A regra de verdade é a API** (`authMiddleware` + `roleMiddleware` + checagens no service).

### Proteções importantes

- RH **não** pode editar, desativar, resetar senha nem apagar um SUPER_ADMIN.
- Só SUPER_ADMIN cria outro SUPER_ADMIN.
- Pedido do REQUESTER: ownership por `requesterId`.
- RESTAURANT: filtro por `restaurantId` do usuário logado.
- Preço da marmita para REQUESTER: o `companyId` é forçado ao da própria empresa.

---

## Rate limit

Plugin `@fastify/rate-limit`, armazenamento **em memória** do processo.

| Escopo | Limite | Observação |
| --- | --- | --- |
| Global | 100 / min / IP | Todas as rotas |
| `POST /users/login` | 10 / min / IP | + limite por conta |
| Login por conta | 5 falhas / 15 min | e-mail ou unidade+cartão |
| Forgot / reset / email-challenge | 5 / min / IP | superfície sensível |
| Cadastro público | 10 / min / IP | registration-requests |
| Avatar, PDF, relatório | 10 / min / IP | rotas caras |
| Lookup / register-by-card | 20 / min / IP | API corporativa |

Quando o limite estoura, a API responde **429** com mensagem amigável e, quando possível, header `Retry-After`. O evento também vai para o log da aplicação.

### `TRUST_PROXY`

O Fastify usa `TRUST_PROXY` do `.env` (`false` | `true` | número de hops). Com `true` sem um proxy confiável na frente, um cliente pode forjar `X-Forwarded-For` e burlar o limite por IP. Em desenvolvimento local deixe `false`. Em produção, configure o número de hops do seu reverse proxy (nginx, Traefik, etc.).

### Várias instâncias da API

O contador em memória **não** é compartilhado entre réplicas. Se você subir mais de um processo/container da API atrás de um load balancer, o rate limit efetivo se multiplica. Nesse caso, o caminho certo é um store Redis no `@fastify/rate-limit` (não configurado neste repositório — documentado de propósito).

---

## Força bruta e enumeração

- **Login:** mensagem única (“Credenciais inválidas”), `bcrypt.compare` também contra um hash fictício quando o usuário não existe/inativo (evita timing óbvio), limite por IP + por conta.
- **Forgot password:** resposta genérica — não revela se o e-mail existe.
- **Código de e-mail:** 6 dígitos, TTL 10 min, cooldown de reenvio 60 s, **máximo 5 tentativas** — depois o código é invalidado e é preciso pedir outro.
- **Cadastro público:** ainda diferencia “e-mail já usado” / cartão inválido (necessário para UX). O rate limit mitiga varredura; não elimina enumeração nessa superfície.

---

## Validação de entrada e uploads

- Controllers validam com **Zod** (`maxLength` em nomes, notas, descrições, telefone, cartão, senha, data URL de avatar, tokens de reset).
- Body global limitado a **1 MB** no Fastify.
- Avatar: data URL WebP/JPEG/PNG, checagem de magic bytes, teto ~300 KB binário, path com UUID sob `avatars/`, sem `..` na exclusão/URL pública.
- E-mails HTML escapam nome e links (`escapeHtml`).
- API Pedertractor: URL só do `.env` (sem SSRF), timeout de 8 s, erro genérico ao cliente (status HTTP externo não vaza).

---

## Headers, CORS e CSP

**Back-end**

- `@fastify/helmet` (CSP ligada em production).
- CORS com allowlist: `FRONT_END_URL` + `CORS_ORIGINS` (vírgula).
- Swagger/OpenAPI só fora de production.

**Front (nginx do Docker)**

- `Content-Security-Policy` restritiva (scripts same-origin, fonts Google, `connect-src` para a API).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` sem câmera/microfone/geolocalização
- `server_tokens off`

---

## Auditoria

Eventos gravados em `AuditLog` (consulta só SUPER_ADMIN), incluindo:

- login sucesso / falha
- pedido e conclusão de reset de senha
- troca de senha
- criação, edição, reset e exclusão de usuário pelo admin
- registro por cartão
- troca de e-mail
- avatar
- aprovação/rejeição de cadastro
- mudanças em empresas, preços, cardápio e pedidos (já existentes)

Falhas de login registram método e identificador sem a senha.

---

## Segredos e variáveis de ambiente

Nunca commitar `.env`. O repositório ignora `.env` e versiona só `.env.example`.

| Variável | Função |
| --- | --- |
| `JWT_SECRET` | Assinatura do token (≥ 32 chars, aleatório em prod) |
| `JWT_EXPIRES_IN` | Vida do token (ex.: `12h`) |
| `TRUST_PROXY` | Confiança em X-Forwarded-For |
| `DATABASE_URL` / `POSTGRES_*` | Banco |
| `APPNAME` / `APPKEY` / `API_PEDERTRACTOR_URL` | Integração corporativa |
| `CORREIO` / `EMAIL_AUTOMACAO` / `PASSWORD_AUTOMACAO` | SMTP |
| `FRONT_END_URL` / `CORS_ORIGINS` | Origens permitidas |
| `UPLOADS_DIR` | Pasta de avatares |
| `ALLOW_PROD_SEED` | Única forma de seed em `NODE_ENV=production` |

No front, só `VITE_API_URL` vai para o bundle — não coloque segredos em variáveis `VITE_*`.

---

## Docker e deploy

- **Back-end** roda como usuário `node` (não root).
- TLS estrito no `npm install` por padrão. Se o proxy corporativo quebrar o SSL, use `--build-arg ALLOW_INSECURE_TLS=1` conscientemente.
- Postgres no compose escuta em `127.0.0.1:3406` e lê `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` do ambiente.
- Seed **recusa** `NODE_ENV=production` salvo `ALLOW_PROD_SEED=true`, e não imprime senha no console.
- Front tem `.dockerignore` para não embutir `.env` no build.

---

## Dependências

Mantemos dependências de runtime atualizadas (`fastify`, `@fastify/jwt`, `@fastify/static`, `zod`, `prisma`, `axios`, `nodemailer`). Rode periodicamente:

```bash
cd back-end && npm audit --omit=dev
cd front-end && npm audit --omit=dev
```

Corrija high/critical antes de ir para produção.

Nota: `@fastify/swagger-ui` (só registrado quando `NODE_ENV !== 'production'`) ainda pode puxar uma versão antiga aninhada de `@fastify/static`. Em produção o Swagger nem sobe — o risco fica restrito a ambientes de desenvolvimento.

---

## Checklist de produção

1. `JWT_SECRET` forte e único; `JWT_EXPIRES_IN` ≤ 12h.
2. `TRUST_PROXY` alinhado ao reverse proxy real.
3. Postgres com senha forte, sem porta pública na internet.
4. `NODE_ENV=production`, HTTPS na frente (TLS termina no proxy).
5. SMTP e integração Pedertractor configurados; sem placeholders.
6. `FRONT_END_URL` / `CORS_ORIGINS` só com origins reais.
7. Seed **não** roda em produção (ou só com `ALLOW_PROD_SEED` consciente).
8. Backups do Postgres e volume de `uploads`.
9. `npm audit --omit=dev` limpo (ou riscos aceitos documentados).
10. Se houver mais de uma réplica da API, planejar Redis para rate limit.

---

## Como reportar uma vulnerabilidade

Se você descobriu um problema de segurança:

1. **Não** abra issue pública com detalhes exploráveis.
2. Avise o time responsável pela Marmita (canal interno / e-mail do time de TI).
3. Inclua: o que observou, passos para reproduzir, impacto estimado e se já explorou em produção.
4. Aguarde confirmação antes de divulgar.

Obrigado por ajudar a manter o almoço — e as contas — em segurança.
