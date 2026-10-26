# Marmita

Sistema **Marmita** de solicitação de marmitas com papéis **SUPER_ADMIN**, **RH**, **RESTAURANT** e **REQUESTER**. Mascote: **Tigela**.

## Pré-requisitos

- Node.js 20+
- PostgreSQL (via Docker do back-end na porta **3406**)
- Rede Docker `marmita-network` (para o front em container)

## Subir o ambiente

### 1. Banco + API (back-end)

```bash
cd back-end
cp .env.example .env   # se ainda não existir
docker compose up -d   # Postgres em localhost:3406
npm install
npx prisma migrate dev
npm run db:seed
npm run dev            # API em http://127.0.0.1:3404
```

### 2. Frontend

```bash
cd front-end
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:3404
npm install
npm run dev            # Vite (geralmente http://localhost:5173)
```

### Front em Docker (opcional)

```bash
docker network create marmita-network   # uma vez
cd front-end
docker compose up -d --build            # http://localhost:3405
```

## Credenciais do seed

| Papel        | E-mail                      | Senha         |
| ------------ | --------------------------- | ------------- |
| SUPER_ADMIN  | admin@marmita.local         | admin123      |
| RH           | rh@marmita.local            | rh123         |
| RESTAURANT   | restaurante@marmita.local   | rest123       |
| REQUESTER    | pedro@jardinagem.local      | requester123  |

## Portas

| Serviço  | Porta |
| -------- | ----- |
| Postgres | 3406  |
| API      | 3404  |
| Front Docker | 3405 |

## Fluxo resumido

1. Solicitante se cadastra em `/cadastro` (colaborador Pedertractor/Tractor via cartão, ou empresa externa)
2. RH aprova a solicitação em `/solicitacoes` e define o preço da marmita da empresa
3. RH também pode ajustar preços por empresa em `/precos`
4. Restaurante publica o cardápio do dia
5. Solicitante monta o pedido (quantidade → destinatários → itens → revisão)
6. Restaurante avança o status até entrega
7. RH consulta dashboards e relatório por empresa

## Integração Pedertractor (back-end)

Para validar cartões de colaboradores no cadastro público, configure no `.env` do back-end:

- `APPNAME` — header de autenticação da API externa
- `APPKEY` — chave da API externa
- `API_PEDERTRACTOR_URL` — URL base da API de colaboradores
