<h1 align="center" style="font-weight: bold;">Garimpei Automation ☕</h1>

<p align="center">
  <a href="#-english">English</a> • 
  <a href="#-português">Português</a>
</p>

<p align="center">
<a href="#tech">Technologies</a> •
<a href="#started">Getting Started</a> •
<a href="#routes">API Endpoints</a> •
<a href="#colab">Collaborators</a> •
<a href="#contribute">Contribute</a>
</p>

<h5 id="-english">🇺🇸 English</h5>

<p align="center">
<b>Event-driven WhatsApp Bot and Orchestrator for Affiliate Marketing Curation.</b>
</p>

<p align="center">
<i>This project serves as the core orchestrator for the Garimpei ecosystem. It seamlessly bridges the gap between link ingestion via WhatsApp, data extraction (communicating with Garimpei API REST), and the final curation process. It was built to handle high-volume product link ingestion autonomously, providing a robust Multi-tenant Curation API for frontends to approve, format, and dispatch offers to WhatsApp groups without spam or duplication.</i>
</p>

<h2 id="tech">💻 Technologies</h2>

Node.js (Main Runtime)

Express (Web framework for Curation API)

WppConnect (WhatsApp Web JS for multi-session management)

PostgreSQL / Neon DB (ACID-compliant Database for Queues and Curation)

Axios (HTTP Client for API communication)

Multer (Middleware for handling multipart/form-data and image uploads)

Jest & Supertest (Unit and Integration testing)

Docker (Containerization for scalable deployment)

<h2 id="features">🧾 Key Features & Architecture</h2>

To ensure no messages are lost and the application scales, the orchestrator implements advanced backend patterns:

- **Asynchronous Event-Driven Engine:** Link ingestion and data extraction are decoupled. The WhatsApp listener instantly saves messages to an `ingestion_queue` (PostgreSQL), freeing the main thread, while a background Worker processes them at its own pace.
- **Autonomous Dispatch Engine (Cron):** A robust background worker that continuously checks active dispatch rules. It respects user-defined time windows (with Timezone failsafes), minimum intervals, and niche-specific targeting. Includes a 3-strike error handling system to discard faulty products.
- **Transactional Queues:** Uses `FOR UPDATE SKIP LOCKED` in PostgreSQL to ensure robust queue orchestration. This prevents race conditions and guarantees that no two workers will process the same product link simultaneously.
- **Multi-Tenancy & Session Isolation:** Supports multiple WhatsApp accounts concurrently. Data is strictly isolated using `userId` relationships, verified via custom `authMiddleware` (`x-api-key` and `x-user-id`), ensuring users only access their own curated products.
- **Anti-Duplication Engine (Upsert):** Implements strict database-level locks on `(user_id, original_link)`. If an approved product already exists, the system automatically updates its price and discount, and re-queues it for dispatch, preventing group spamming.
- **Dynamic Message Formatter & Image Processing:** Built-in utility that generates WhatsApp-ready markdown previews dynamically, and handles local image editing (watermarking) with static file serving (`/uploads`) for frontend previews.
- **Real-Time Analytics & SSE:** Server-Sent Events integration for live dashboard updates without polling, alongside aggregated executive summaries (`/dashboard/summary`).
- **Monetization & Quota Engine:** Built-in safeguards limiting daily product ingestion (max 400/day), autonomous dispatches (max 125/day), and allowed dispatch groups (max 5/user) to protect server health and enable tiered SaaS plans.

<h2 id="started">🚀 Getting started</h2>

This project uses Puppeteer in Singleton mode to manage Chromium instances and ensure data extraction performance across different marketplaces with varying security levels.

<h3>Prerequisites</h3>

NodeJS (v18 or higher recommended)

Git

PostgreSQL Instance (Neon DB account recommended)

A running instance of `garimpei-api-rest`

Docker and Docker Compose

<h3>Cloning</h3>

```bash
git clone https://github.com/jglucian0/garimpei-automation
```

<h3>Config .env variables</h3>

Create a .env file in the root of the project with the following variables:

```yaml
PORT=3001
DATABASE_URL=postgres://user:password@neon-db-url/dbname
DATABASE_SSL=true
NODE_ENV=development
GARIMPEI_API_URL=http://localhost:3001
INTERNAL_API_KEY=your_secure_api_key
```

<h3>Starting</h3>

1. For Local Development (Fast reloading):

```bash
cd garimpei-automation
npm install   # To run in development
npm run dev   # To run tests
npm test
```

2. For Production / VPS (Dockerized):
   The Docker setup automatically installs a lightweight Linux environment along with all necessary Chrome/Puppeteer dependencies.

```bash
npm run docker:build  # Builds the image and starts the container
npm run docker:up     # Starts the container in detached mode (background)
npm run docker:logs   # Attach to container logs
npm run docker:down   # Stops and removes the container
```

<h2 id="whatsapp-auth">📱 WhatsApp Authentication</h2>

Unlike traditional APIs, this system requires a WhatsApp connection to ingest links.
When you start the application, you need to initiate a session and scan the QR Code via the terminal.

Send a POST /session/start request with your userId and desired sessionId.

Check the terminal for the generated QR Code.

Scan it using the "Linked Devices" feature on your WhatsApp app.

Send any shortened marketplace link (e.g., meli.la/xxx) to the connected number to trigger the ingestion worker!

<h2 id="routes">📍 API Endpoints</h2>

<h2 id="routes">📍 Endpoints da API</h2>

| route                                             | description                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>POST /session/start</kbd>                    | inicializa uma sessão do WhatsApp e a vincula a um userId no banco de dados. [details](#post-session-start)                                             |
| <kbd>GET /session/list</kbd>                      | 🔒 lista todas as sessões ativas do WhatsApp para o usuário autenticado. [details](#get-session-list)                                                   |
| <kbd>GET /session/status/:sessionId</kbd>         | 🔒 verifica o status em tempo real de uma sessão específica do WhatsApp.                                                                                |
| <kbd>DELETE /session/:sessionId</kbd>             | 🔒 desconecta e remove uma sessão do WhatsApp (remove em cascata as configurações de disparo).                                                          |
| <kbd>GET /session/:sessionId/groups</kbd>         | 🔒 busca todos os grupos de WhatsApp dos quais o bot faz parte (para seleção no frontend).                                                              |
| <kbd>POST /session/:sessionId/groups/config</kbd> | 🔒 configura o papel de um grupo ('coletor' ou 'dispatch') e o nicho. [details](#post-group-config)                                                     |
| <kbd>GET /curation/pending</kbd>                  | 🔒 busca todos os produtos pendentes do usuário autenticado, incluindo previews formatados para WhatsApp. [details](#get-curation-pending)              |
| <kbd>PUT /curation/pending/:id</kbd>              | 🔒 edita um produto pendente (suporta JSON para textos e `multipart/form-data` para upload de nova imagem). [details](#put-curation-edit)               |
| <kbd>POST /curation/approve/:id</kbd>             | 🔒 aprova um produto, aplica o bloqueio anti-duplicação e o move para a fila final de disparo. [details](#post-curation-approve)                        |
| <kbd>DELETE /curation/reject/:id</kbd>            | 🔒 rejeita e remove permanentemente uma extração inválida do banco de dados. [details](#delete-curation-reject)                                         |
| <kbd>GET /curation/approved</kbd>                 | 🔒 lista todos os produtos aprovados prontos para envio.                                                                                                |
| <kbd>GET /curation/metrics</kbd>                  | 🔒 busca métricas da fila pendente agrupadas por nicho para dashboards. [details](#get-curation-metrics)                                                |
| <kbd>GET /curation/history</kbd>                  | 🔒 busca o histórico de envios (apenas status 'dispatched' dos últimos 7 dias). [details](#get-curation-history)                                        |
| <kbd>POST /curation/send-now/:id</kbd>            | 🔒 disparo imediato: formata e envia instantaneamente um produto aprovado para o WhatsApp, ignorando regras de cron. [details](#post-curation-send-now) |
| <kbd>PUT /curation/approved/:id</kbd>             | 🔒 edita um produto aprovado na fila de envio (suporta JSON ou `multipart/form-data`). [details](#put-curation-edit)                                    |
| <kbd>DELETE /curation/approved/:id</kbd>          | 🔒 deleta um produto aprovado da fila de envio e remove sua imagem local. [details](#delete-curation-reject)                                            |
| <kbd>POST /dispatch-config</kbd>                  | 🔒 cria ou atualiza uma configuração de janela de disparo (Upsert). [details](#post-dispatch-config)                                                    |
| <kbd>GET /dispatch-config</kbd>                   | 🔒 lista todas as configurações de disparo do usuário. [details](#get-dispatch-config)                                                                  |
| <kbd>PATCH /dispatch-config/:id/pause</kbd>       | 🔒 pausa ou retoma o motor de disparo para uma configuração específica de nicho. [details](#patch-dispatch-config)                                      |
| <kbd>DELETE /dispatch-config/:id</kbd>            | 🔒 remove uma configuração específica de disparo. [details](#delete-dispatch-config)                                                                    |
| <kbd>GET /dashboard/summary</kbd>                 | 🔒 busca o resumo analítico executivo (total enviados, pendentes, falhas e nicho principal). [details](#get-dashboard-summary)                          |
| <kbd>GET /dashboard/stream</kbd>                  | 🔒 conecta ao stream de Server-Sent Events (SSE) para notificações em tempo real. [details] (#get-dashboard-stream)                                     |

**_Authentication & Headers_**

Note: Endpoints marked with 🔒 require authentication. You must pass the following headers in your HTTP request:

```json
Content-Type: application/json
x-api-key: your_api_key
x-user-id: garimpei_user_01
```

<h3 id="post-session-start">POST /session/start</h3>

_Note: Inicializa uma instância do WppConnect e a vincula ao usuário. Verifique o terminal para escanear o QR Code._

**_REQUEST BODY_**

```json
{
  "userId": "garimpei_user_01",
  "sessionId": "sessao_A"
}
```

**_RESPONSE_**

```json
{
  "message": "Processo de conexão iniciado para a sessão sessao_A. Aguarde o QR Code."
}
```

---

<h3 id="get-session-list">🔒 GET /session/list</h3>

_Note: Lista todas as sessões ativas do WhatsApp para o usuário autenticado._

**_RESPONSE_**

```json
[
  {
    "sessionId": "sessao_A",
    "userId": "garimpei_user_01",
    "status": "connected",
    "qrcode": null,
    "interfaceReady": true
  }
]
```

---

<h3 id="post-group-config">🔒 POST /session/:sessionId/groups/config</h3>

_Note: Configura as permissões e o nicho de um grupo específico do WhatsApp._

**_REQUEST BODY_**

```json
{
  "groupId": "120363427118176310@g.us",
  "groupName": "Premium Offers Group",
  "role": "coletor",
  "niche": "academia"
}
```

**_RESPONSE_**

```json
{
  "success": true,
  "message": "Grupo 'Premium Offers Group' configurado como 'coletor' com sucesso!"
}
```

---

<h3 id="get-curation-pending">🔒 GET /curation/pending</h3>

_Note: Busca a lista de produtos aguardando aprovação. Retorna uma mensagem pré-formatada para WhatsApp._

**_RESPONSE_**

```json
[
  {
    "id": 11,
    "session_id": "sessao_A",
    "marketplace": "ML",
    "title": "Creatina Monohidratada 1kg Black Skull",
    "affiliate_link": "[https://meli.la/2TetZ81]",
    "current_price": "57.99",
    "local_image_path": "uploads/offers/temp_123.jpg",
    "formattedMessage": "🚨 *ACHADOS GARIMPEI* 🚨\n\n*Creatina Monohidratada 1kg Black Skull*\n..."
  }
]
```

---

<h3 id="put-curation-edit">🔒 PUT /curation/pending/:id & /curation/approved/:id</h3>

_Note: Atualiza informações do produto dinamicamente. Para alterar apenas textos, envie JSON. Para imagem, use multipart/form-data._

**_JSON REQUEST BODY (Text only update)_**

```json
{
  "title": "Updated Nike Shoes",
  "current_price": "199.90",
  "niche": "corrida"
}
```

**_RESPONSE_**

```json
{
  "message": "Produto atualizado com sucesso!",
  "product": {
    "id": 11,
    "title": "Updated Nike Shoes",
    "current_price": "199.90"
  }
}
```

---

<h3 id="post-curation-approve">🔒 POST /curation/approve/:id</h3>

_Note: Aprova o produto e o move para a fila final com controle de duplicação._

**_REQUEST BODY_**

```json
{
  "niche": "academia"
}
```

**_RESPONSE_**

```json
{
  "message": "Produto aprovado e enviado para a fila de disparo com sucesso!",
  "product": {
    "id": 1,
    "title": "Creatina Monohidratada 1kg Black Skull",
    "status": "pending_dispatch"
  }
}
```

---

<h3 id="post-curation-send-now">🔒 POST /curation/send-now/:id</h3>

_Note: Dispara instantaneamente um produto aprovado._

**_RESPONSE_**

```json
{
  "message": "Disparo instantâneo realizado com sucesso!"
}
```

---

<h3 id="post-dispatch-config">🔒 POST /dispatch-config</h3>

_Note: Cria ou atualiza uma configuração de disparo._

**_RESPONSE_**

```json
{
  "message": "Configuração de disparo salva com sucesso!",
  "config": {
    "id": 1,
    "niche": "academia",
    "interval_minutes": 5
  }
}
```

---

<h3 id="patch-dispatch-config">🔒 PATCH /dispatch-config/:id/pause</h3>

_Note: Pausa ou retoma o motor de disparo._

**_RESPONSE_**

```json
{
  "message": "Configuração atualizada com sucesso!",
  "config": {
    "id": 1,
    "is_paused": true
  }
}
```

---

<h3 id="delete-dispatch-config">🔒 DELETE /dispatch-config/:id</h3>

_Note: Remove uma configuração de disparo._

**_RESPONSE_**

```json
{
  "message": "Configuração de disparo removida com sucesso."
}
```

---

<h3 id="delete-curation-reject">🔒 DELETE /curation/reject/:id</h3>

_Note: Remove permanentemente um produto._

**_RESPONSE_**

```json
{
  "message": "Produto rejeitado e imagem removida com sucesso."
}
```

---

<h3 id="get-dashboard-stream">🔒 GET /dashboard/stream</h3>

_Note: Abre conexão SSE._

**_RESPONSE (Stream)_**

```text
data: {"event":"CONNECTED","message":"Conectado ao motor de disparo..."}

data: {"event":"DISPATCH_SUCCESS","product_id":11,"niche":"academia","timestamp":"2026-03-28T14:30:00.000Z"}
```

<h2 id="colab">🤝 Collaborators</h2>

<table>
  <tr>
    <td align="center">
      <a href="#">
        <img src="https://avatars.githubusercontent.com/u/169113323?v=4" width="100px;" alt="João Gabriel Profile Picture"/><br>
        <sub>
          <b>João Gabriel Luciano</b>
        </sub>
      </a>
    </td>
    <td align="center">
      <a href="#">
        <img src="https://t.ctcdn.com.br/n7eZ74KAcU3iYwnQ89-ul9txVxc=/400x400/smart/filters:format(webp)/i490769.jpeg" width="100px;" alt="Elon Musk Picture"/><br>
        <sub>
          <b>Elon Musk</b>
        </sub>
      </a>
    </td>
    <td align="center">
      <a href="#">
        <img src="https://miro.medium.com/max/360/0*1SkS3mSorArvY9kS.jpg" width="100px;" alt="Foto do Steve Jobs"/><br>
        <sub>
          <b>Steve Jobs</b>
        </sub>
      </a>
    </td>
  </tr>
</table>

<h2 id="contribute">📫 Contribute</h2>

git checkout -b feature/yout-feature

Follow commit patterns (Conventional Commits).

Ensure tests are passing

Open a Pull Request detailing the changes.

---

<p align="center">
<a href="#tech-pt">Tecnologias</a> •
<a href="#started-pt">Primeiros Passos</a> •
<a href="#routes-pt">API Endpoints</a> •
<a href="#colab-pt">Colaboradores</a> •
<a href="#contribute-pt">Contribuições</a>
</p>

<h5 id="-português">🇧🇷 Português</h5>

<p align="center">
<b>Bot de WhatsApp orientado a eventos e Orquestrador para Curadoria de Marketing de Afiliados.</b>
</p>

<p align="center">
<i>Este projeto serve como o orquestrador principal do ecossistema Garimpei. Ele conecta perfeitamente a ingestão de links via WhatsApp, a extração de dados (comunicando-se com a Garimpei API REST) e o processo final de curadoria. Foi construído para lidar de forma autônoma com alto volume de ingestão de links de produtos, fornecendo uma robusta API de Curadoria Multi-tenant para que frontends possam aprovar, formatar e enviar ofertas para grupos de WhatsApp sem spam ou duplicação.</i>
</p>

<h2 id="tech">💻 Tecnologias</h2>

Node.js (Runtime Principal)

Express (Framework web para API de Curadoria)

WppConnect (WhatsApp Web JS para gerenciamento multi-sessão)

PostgreSQL / Neon DB (Banco de dados compatível com ACID para filas e curadoria)

Axios (Cliente HTTP para comunicação com API)

Multer (Middleware para lidar com multipart/form-data e upload de imagens)

Jest & Supertest (Testes unitários e de integração)

Docker (Containerização para deploy escalável)

<h2 id="features">🧾 Principais Funcionalidades & Arquitetura</h2>

Para garantir que nenhuma mensagem seja perdida e que a aplicação escale, o orquestrador implementa padrões avançados de backend:

- **Motor Assíncrono Orientado a Eventos:** A ingestão de links e a extração de dados são desacopladas. O listener do WhatsApp salva instantaneamente as mensagens em uma `ingestion_queue` (PostgreSQL), liberando a thread principal, enquanto um Worker em segundo plano as processa no seu próprio ritmo.
- **Motor de Disparo Autônomo (Cron):** Um worker robusto que verifica continuamente regras de envio ativas. Ele respeita janelas de horário definidas pelo usuário (com proteção de fuso horário), intervalos mínimos e segmentação por nicho. Inclui um sistema de 3 tentativas para descartar produtos com falha.
- **Filas Transacionais:** Utiliza `FOR UPDATE SKIP LOCKED` no PostgreSQL para garantir uma orquestração robusta das filas. Isso evita condições de corrida e garante que dois workers não processem o mesmo link simultaneamente.
- **Multi-Tenancy & Isolamento de Sessões:** Suporta múltiplas contas de WhatsApp simultaneamente. Os dados são isolados via `userId`, verificados por um `authMiddleware` customizado (`x-api-key` e `x-user-id`).
- **Motor Anti-Duplicação (Upsert):** Implementa locks a nível de banco em `(user_id, original_link)`. Se um produto já existir, ele atualiza preço/desconto e reenfileira para envio, evitando spam.
- **Formatador Dinâmico de Mensagens & Processamento de Imagem:** Gera previews em markdown para WhatsApp e processa imagens localmente (watermark).
- **Analytics em Tempo Real & SSE:** Integração com Server-Sent Events para dashboards em tempo real.
- **Sistema de Monetização & Limites:** Limites de ingestão (400/dia), disparos (125/dia) e grupos (5 por usuário).

<h2 id="started">🚀 Começando</h2>

Este projeto usa Puppeteer em modo Singleton para gerenciar instâncias do Chromium.

<h3>Pré-requisitos</h3>

NodeJS (v18 ou superior recomendado)

Git

Instância PostgreSQL (Neon DB recomendado)

Uma instância rodando de `garimpei-api-rest`

Docker e Docker Compose

<h3>Clonando</h3>

```bash
git clone https://github.com/jglucian0/garimpei-automation
```

<h3>Configurar variáveis .env</h3>

Crie um arquivo .env na raiz do projeto:

```yaml
PORT=3001
DATABASE_URL=postgres://user:password@neon-db-url/dbname
DATABASE_SSL=true
NODE_ENV=development
GARIMPEI_API_URL=http://localhost:3001
INTERNAL_API_KEY=your_secure_api_key
```

<h3>Iniciando</h3>

1. Desenvolvimento local:

```bash
cd garimpei-automation
npm install
npm run dev
npm test
```

2. Produção (Docker):

```bash
npm run docker:build
npm run docker:up
npm run docker:logs
npm run docker:down
```

<h2 id="whatsapp-auth">📱 Autenticação WhatsApp</h2>

Diferente de APIs tradicionais, este sistema requer conexão com WhatsApp.

Envie POST /session/start com userId e sessionId.

Escaneie o QR Code no terminal.

Envie links (ex: meli.la/xxx) para iniciar ingestão.

<h2 id="routes">📍 Endpoints da API</h2>

(Todos endpoints permanecem idênticos — apenas descrições traduzidas.)

<h2 id="colab">🤝 Colaboradores</h2>

João Gabriel Luciano  
Elon Musk  
Steve Jobs

<h2 id="contribute">📫 Contribuir</h2>

git checkout -b feature/yout-feature

Seguir Conventional Commits.

Garantir testes passando

Abrir Pull Request detalhando mudanças.
