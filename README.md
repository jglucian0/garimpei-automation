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

| route                                             | description                                                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>POST /session/start</kbd>                    | initializes a WhatsApp session and links it to a userId in the database. [details](#post-session-start)                                  |
| <kbd>GET /session/list</kbd>                      | 🔒 lists all active WhatsApp sessions for the authenticated user. [details](#get-session-list)                                           |
| <kbd>GET /session/status/:sessionId</kbd>         | 🔒 checks the real-time status of a specific WhatsApp session.                                                                           |
| <kbd>DELETE /session/:sessionId</kbd>             | 🔒 disconnects and removes a WhatsApp session (Cascades delete dispatch configs).                                                        |
| <kbd>GET /session/:sessionId/groups</kbd>         | 🔒 fetches all WhatsApp groups the bot is part of (for frontend selection).                                                              |
| <kbd>POST /session/:sessionId/groups/config</kbd> | 🔒 configures a group role ('coletor' or 'dispatch') and niche. [details](#post-group-config)                                            |
| <kbd>GET /curation/pending</kbd>                  | 🔒 fetches all pending products for the authenticated user, including formatted WhatsApp previews. [details](#get-curation-pending)      |
| <kbd>PUT /curation/pending/:id</kbd>              | 🔒 edits a pending product (supports JSON for texts, and `multipart/form-data` for new image uploads). [details](#put-curation-edit)     |
| <kbd>POST /curation/approve/:id</kbd>             | 🔒 approves a product, applies the Anti-Duplication Lock, and moves it to the final dispatch queue. [details](#post-curation-approve)    |
| <kbd>DELETE /curation/reject/:id</kbd>            | 🔒 rejects and permanently removes a bad extraction from the database. [details](#delete-curation-reject)                                |
| <kbd>GET /curation/approved</kbd>                 | 🔒 lists all approved products ready for dispatch.                                                                                       |
| <kbd>GET /curation/metrics</kbd>                  | 🔒 fetches pending queue metrics grouped by niche for dashboard displays. [details](#get-curation-metrics)                               |
| <kbd>GET /curation/history</kbd>                  | 🔒 fetches the dispatch history (only 'dispatched' status from the last 7 days). [details](#get-curation-history)                        |
| <kbd>POST /curation/send-now/:id</kbd>            | 🔒 flash dispatch: instantly formats and sends an approved product to WhatsApp, bypassing cron rules. [details](#post-curation-send-now) |
| <kbd>PUT /curation/approved/:id</kbd>             | 🔒 edits an approved product in the dispatch queue (supports JSON or `multipart/form-data`). [details](#put-curation-edit)               |
| <kbd>DELETE /curation/approved/:id</kbd>          | 🔒 deletes an approved product from the dispatch queue and removes its local image. [details](#delete-curation-reject)                   |
| <kbd>POST /dispatch-config</kbd>                  | 🔒 creates or updates a dispatch time-window configuration (Upsert). [details](#post-dispatch-config)                                    |
| <kbd>GET /dispatch-config</kbd>                   | 🔒 lists all dispatch configurations for the user. [details](#get-dispatch-config)                                                       |
| <kbd>PATCH /dispatch-config/:id/pause</kbd>       | 🔒 pauses or resumes the dispatch engine for a specific niche configuration. [details](#patch-dispatch-config)                           |
| <kbd>DELETE /dispatch-config/:id</kbd>            | 🔒 deletes a specific dispatch configuration. [details](#delete-dispatch-config)                                                         |

**_Authentication & Headers_**

Note: Endpoints marked with 🔒 require authentication. You must pass the following headers in your HTTP request:

```json
Content-Type: application/json
x-api-key: your_api_key
x-user-id: garimpei_user_01
```

<h3 id="post-session-start">POST /session/start</h3>

_Note: Initializes a WppConnect instance and links it to the user. Check the terminal to scan the QR Code._

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
  "message": "Connection process started for session sessao_A. Wait for the QR Code."
}
```

---

<h3 id="get-session-list">🔒 GET /session/list</h3>

_Note: Lists all active WhatsApp sessions for the authenticated user._

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

_Note: Configures a specific WhatsApp group's permissions and targeting niche._

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
  "message": "Group 'Premium Offers Group' configured as 'coletor' successfully!"
}
```

---

<h3 id="get-curation-pending">🔒 GET /curation/pending</h3>

_Note: Fetches the list of products waiting for approval. Returns a pre-formatted WhatsApp message string._

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

_Note: Updates product information dynamically. To change texts only, send a JSON body. To upload a new image, send a `multipart/form-data` request with an `image` file field._

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
  "message": "Product updated successfully!",
  "product": {
    "id": 11,
    "title": "Updated Nike Shoes",
    "current_price": "199.90"
  }
}
```

---

<h3 id="post-curation-approve">🔒 POST /curation/approve/:id</h3>

_Note: Approves the product, assigns a niche, removes it from the pending queue, and applies the Anti-Duplication Upsert lock into the final dispatch table._

**_REQUEST BODY_**

```json
{
  "niche": "academia"
}
```

**_RESPONSE_**

```json
{
  "message": "Product approved and queued for successful shooting!",
  "product": {
    "id": 1,
    "title": "Creatina Monohidratada 1kg Black Skull",
    "status": "pending_dispatch"
  }
}
```

---

<h3 id="get-curation-metrics">🔒 GET /curation/metrics</h3>

_Note: Fetches pending queue metrics grouped by niche for dashboard displays._

**_RESPONSE_**

```json
[
  {
    "niche": "academia",
    "pending_count": "15"
  },
  {
    "niche": "tecnologia",
    "pending_count": "3"
  }
]
```

---

<h3 id="get-curation-history">🔒 GET /curation/history</h3>

_Note: Fetches the dispatch history (only 'dispatched' status from the last 7 days)._

**_RESPONSE_**

```json
[
  {
    "id": 24,
    "user_id": "garimpei_user_01",
    "marketplace": "ML",
    "title": "Tênis Nike",
    "status": "dispatched",
    "niche": "academia",
    "updated_at": "2026-03-28T14:30:00.000Z"
  }
]
```

---

<h3 id="post-curation-send-now">🔒 POST /curation/send-now/:id</h3>

_Note: Instantly dispatches a pending product directly to the configured WhatsApp group, ignoring the cron interval and time windows._

**_RESPONSE_**

```json
{
  "message": "Instant firing successful!"
}
```

---

<h3 id="post-dispatch-config">🔒 POST /dispatch-config</h3>

_Note: Creates or updates a Dispatch Engine configuration (Upsert based on session and niche). Defines when and how often the worker should dispatch messages._

**_REQUEST BODY_**

```json
{
  "sessionId": "sessao_A",
  "niche": "academia",
  "intervalMinutes": 5,
  "window1Start": "08:00",
  "window1End": "12:00",
  "window_2_start": null, // optional
  "window_2_end": null, // optional
  "isPaused": false
}
```

**_RESPONSE_**

```json
{
  "message": "Trigger configuration saved successfully!",
  "config": {
    "id": 1,
    "niche": "academia",
    "interval_minutes": 5
  }
}
```

---

<h3 id="get-dispatch-config">🔒 GET /dispatch-config</h3>

_Note: Lists all dispatch configurations for the authenticated user._

**_RESPONSE_**

```json
[
  {
    "id": 1,
    "user_id": "garimpei_user_01",
    "session_id": "sessao_A",
    "niche": "academia",
    "interval_minutes": 5,
    "window_1_start": "08:00:00",
    "window_1_end": "12:00:00",
    "window_2_start": null,
    "window_2_end": null,
    "is_paused": false
  }
]
```

---

<h3 id="patch-dispatch-config">🔒 PATCH /dispatch-config/:id/pause</h3>

_Note: Pauses or resumes the dispatch engine for a specific niche configuration._

**_REQUEST BODY_**

```json
{
  "isPaused": true
}
```

**_RESPONSE_**

```json
{
  "message": "Configuration updated successfully!",
  "config": {
    "id": 1,
    "is_paused": true
  }
}
```

---

<h3 id="delete-dispatch-config">🔒 DELETE /dispatch-config/:id</h3>

_Note: Deletes a specific dispatch configuration from the database._

**_RESPONSE_**

```json
{
  "message": "Firing configuration removed successfully."
}
```

---

<h3 id="delete-curation-reject">🔒 DELETE /curation/reject/:id & /curation/approved/:id</h3>

_Note: Rejects/Deletes a product, removing it permanently from the database and deleting the local image file._

**_RESPONSE_**

```json
{
  "message": "Product rejected and photo successfully removed."
}
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
<b>Orquestrador e Bot de WhatsApp Orientado a Eventos para Curadoria de Marketing de Afiliados.</b>
</p>

<p align="center">
<i>Este projeto atua como o orquestrador central do ecossistema Garimpei. Ele constrói a ponte entre a ingestão de links via WhatsApp, a extração de dados (comunicando-se com a Garimpei API REST) e o processo final de curadoria. Foi arquitetado para lidar com um alto volume de ingestão de links de forma autônoma, fornecendo uma API de Curadoria Multi-tenant robusta para que frontends possam aprovar, formatar e disparar ofertas para grupos de WhatsApp sem spam ou duplicidade.</i>
</p>

<h2 id="tech-pt">💻 Tecnologias</h2>

Node.js (Runtime principal)

Express (Framework web para API de Curadoria)

WppConnect (WhatsApp Web JS para gestão de múltiplas sessões)

PostgreSQL / Neon DB (Banco de dados transacional para Filas e Curadoria)

Axios (Client HTTP para comunicação entre APIs)

Multer (Middleware para uploads de imagens em formato multipart/form-data)

Jest & Supertest (Testes unitários e de integração)

Docker (Containerização para deploy escalável)

<h2 id="features-pt">🧾 Principais Funcionalidades e Arquitetura</h2>

Para garantir que nenhuma mensagem seja perdida e que a aplicação escale, o orquestrador implementa padrões avançados de backend:

- **Motor Assíncrono Orientado a Eventos:** Ingestão de links e extração de dados são desacopladas. O listener do WhatsApp salva a mensagem instantaneamente em uma ingestion_queue (PostgreSQL), liberando a thread principal, enquanto um Worker em background processa os links no seu próprio ritmo.
- **Filas Transacionais:** Utiliza FOR UPDATE SKIP LOCKED no PostgreSQL para garantir uma orquestração de fila robusta. Isso previne condições de corrida (race conditions) e garante que dois workers nunca processem o mesmo link simultaneamente.
- **Multi-Tenancy e Isolamento de Sessão:** Suporta múltiplas contas de WhatsApp simultaneamente. Os dados são estritamente isolados utilizando relacionamentos de userId, verificados através de um authMiddleware (x-api-key e x-user-id), garantindo que os usuários só tenham acesso aos seus próprios produtos.
- **Motor Anti-Duplicidade (Upsert):** Implementa travas rigorosas a nível de banco de dados em (user_id, original_link). Se um produto aprovado já existir no banco final, o sistema atualiza automaticamente seu preço/desconto e o recoloca na fila de disparo, prevenindo flood (spam) em grupos.
- **Formatador Dinâmico de Mensagens:** Um utilitário integrado que gera previews dinâmicos em markdown perfeitamente compatíveis com o WhatsApp, e gerencia rotinas locais de imagem (marca d'água) com exposição estática via /uploads para leitura pelo frontend.

<h2 id="started-pt">🚀 Primeiros Passos</h2>

Este projeto utiliza o Puppeteer em modo Singleton (através da API) para gerir instâncias do Chromium e garantir performance na extração de dados em diferentes marketplaces com níveis variados de segurança.

<h3>Prerequisites</h3>

NodeJS (v18 ou superior recomendado)

Git

Instância PostgreSQL (Conta no Neon DB recomendada)

Uma instância da garimpei-api-rest rodando

Docker e Docker Compose

<h3>Cloning</h3>

```bash
git clone https://github.com/jglucian0/garimpei-api-rest
```

<h3>Config .env variables</h3>

Crie um ficheiro .env na raiz do projeto com as seguintes variáveis:

```yaml
PORT=3001
DATABASE_URL=postgres://user:password@neon-db-url/dbname
NODE_ENV=development
APP_URL=http://localhost:3001
INTERNAL_API_KEY=sua_chave_de_api
FRONTEND_URL=http://localhost:3000
```

<h3>Starting</h3>

1. Para Desenvolvimento Local (Fast reloading):

```bash
cd garimpei-api
npm install   # Para rodar em desenvolvimento
npm run dev   # Para rodar os testes
npm test
```

2. Para Produção / VPS (Dockerized):
   A configuração do Docker instala automaticamente um ambiente Linux leve contendo todas as dependências necessárias para o Chrome/Puppeteer rodar perfeitamente.

```bash
npm run docker:build  # Constrói a imagem e inicia o container
npm run docker:up     # Inicia o container em segundo plano (detached mode)
npm run docker:logs   # Acompanha os logs do servidor em tempo real
npm run docker:down   # Desliga e remove o container
```

<h2 id="whatsapp-auth-pt">📱 Autenticação do WhatsApp</h2>

Diferente de APIs tradicionais, este sistema requer uma conexão com o WhatsApp para captar os links.
Ao iniciar a aplicação, você precisa inicializar uma sessão e escanear o QR Code via terminal.

Envie uma requisição POST para `/session/start` com seu userId e a sessionId desejada.
Verifique o terminal para ver o QR Code gerado.
Escaneie-o usando a função "Aparelhos Conectados" do seu aplicativo WhatsApp.
Envie qualquer link encurtado de marketplace (ex: meli.la/xxx) para o número conectado para acionar o worker de ingestão!

<h2 id="routes-pt">📍 API Endpoints</h2>

Entendido! O problema era o conflito dos blocos de código internos quebrando o bloco principal na hora de copiar.

Aqui está o arquivo completo. Coloquei tudo dentro de um único bloco principal, e substituí todos os blocos internos (bash, json, yaml) por \*\*\* conforme você pediu. É só clicar em "Copiar" ali no canto superior direito do bloco e colar:

Markdown

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

<h2 id="started">🚀 Getting started</h2>

This project uses Puppeteer in Singleton mode to manage Chromium instances and ensure data extraction performance across different marketplaces with varying security levels.

<h3>Prerequisites</h3>

NodeJS (v18 or higher recommended)

Git

PostgreSQL Instance (Neon DB account recommended)

A running instance of `garimpei-api-rest`

Docker and Docker Compose

<h3>Cloning</h3>

\*\*\*bash
git clone https://github.com/jglucian0/garimpei-automation

---

<h3>Config .env variables</h3>

Create a .env file in the root of the project with the following variables:

\*\*\*yaml
PORT=3001
DATABASE_URL=postgres://user:password@neon-db-url/dbname
DATABASE_SSL=true
NODE_ENV=development
GARIMPEI_API_URL=http://localhost:3001
INTERNAL_API_KEY=your_secure_api_key

---

<h3>Starting</h3>

1. For Local Development (Fast reloading):

\*\*\*bash
cd garimpei-automation
npm install # To run in development
npm run dev # To run tests
npm test

---

2. For Production / VPS (Dockerized):
   The Docker setup automatically installs a lightweight Linux environment along with all necessary Chrome/Puppeteer dependencies.

\*\*\*bash
npm run docker:build # Builds the image and starts the container
npm run docker:up # Starts the container in detached mode (background)
npm run docker:logs # Attach to container logs
npm run docker:down # Stops and removes the container

---

<h2 id="whatsapp-auth">📱 WhatsApp Authentication</h2>

Unlike traditional APIs, this system requires a WhatsApp connection to ingest links.
When you start the application, you need to initiate a session and scan the QR Code via the terminal.

Send a POST /session/start request with your userId and desired sessionId.

Check the terminal for the generated QR Code.

Scan it using the "Linked Devices" feature on your WhatsApp app.

Send any shortened marketplace link (e.g., meli.la/xxx) to the connected number to trigger the ingestion worker!

<h2 id="routes">📍 API Endpoints</h2>

| route                                             | description                                                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>POST /session/start</kbd>                    | initializes a WhatsApp session and links it to a userId in the database. [details](#post-session-start)                                  |
| <kbd>GET /session/list</kbd>                      | 🔒 lists all active WhatsApp sessions for the authenticated user. [details](#get-session-list)                                           |
| <kbd>GET /session/status/:sessionId</kbd>         | 🔒 checks the real-time status of a specific WhatsApp session.                                                                           |
| <kbd>DELETE /session/:sessionId</kbd>             | 🔒 disconnects and removes a WhatsApp session (Cascades delete dispatch configs).                                                        |
| <kbd>GET /session/:sessionId/groups</kbd>         | 🔒 fetches all WhatsApp groups the bot is part of (for frontend selection).                                                              |
| <kbd>POST /session/:sessionId/groups/config</kbd> | 🔒 configures a group role ('coletor' or 'dispatch') and niche. [details](#post-group-config)                                            |
| <kbd>GET /curation/pending</kbd>                  | 🔒 fetches all pending products for the authenticated user, including formatted WhatsApp previews. [details](#get-curation-pending)      |
| <kbd>PUT /curation/pending/:id</kbd>              | 🔒 edits a pending product (supports JSON for texts, and `multipart/form-data` for new image uploads). [details](#put-curation-edit)     |
| <kbd>POST /curation/approve/:id</kbd>             | 🔒 approves a product, applies the Anti-Duplication Lock, and moves it to the final dispatch queue. [details](#post-curation-approve)    |
| <kbd>DELETE /curation/reject/:id</kbd>            | 🔒 rejects and permanently removes a bad extraction from the database. [details](#delete-curation-reject)                                |
| <kbd>GET /curation/approved</kbd>                 | 🔒 lists all approved products ready for dispatch.                                                                                       |
| <kbd>GET /curation/metrics</kbd>                  | 🔒 fetches pending queue metrics grouped by niche for dashboard displays.                                                                |
| <kbd>GET /curation/history</kbd>                  | 🔒 fetches the dispatch history (only 'dispatched' status from the last 7 days).                                                         |
| <kbd>POST /curation/send-now/:id</kbd>            | 🔒 flash dispatch: instantly formats and sends an approved product to WhatsApp, bypassing cron rules. [details](#post-curation-send-now) |
| <kbd>PUT /curation/approved/:id</kbd>             | 🔒 edits an approved product in the dispatch queue (supports JSON or `multipart/form-data`). [details](#put-curation-edit)               |
| <kbd>DELETE /curation/approved/:id</kbd>          | 🔒 deletes an approved product from the dispatch queue and removes its local image. [details](#delete-curation-reject)                   |
| <kbd>POST /dispatch-config</kbd>                  | 🔒 creates or updates a dispatch time-window configuration (Upsert). [details](#post-dispatch-config)                                    |
| <kbd>GET /dispatch-config</kbd>                   | 🔒 lists all dispatch configurations for the user. [details](#delete-curation-reject)                                                    |
| <kbd>PATCH /dispatch-config/:id/pause</kbd>       | 🔒 pauses or resumes the dispatch engine for a specific niche configuration. [details](#delete-curation-reject)                          |
| <kbd>DELETE /dispatch-config/:id</kbd>            | 🔒 deletes a specific dispatch configuration. [details](#delete-curation-reject)                                                         |

**_Authentication & Headers_**

Note: Endpoints marked with 🔒 require authentication. You must pass the following headers in your HTTP request:

```json
Content-Type: application/json
x-api-key: your_api_key
x-user-id: garimpei_user_01
```

<h3 id="post-session-start">POST /session/start</h3>

_Note: Initializes a WppConnect instance and links it to the user. Check the terminal to scan the QR Code._

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
  "message": "Connection process started for session sessao_A. Wait for the QR Code."
}
```

---

<h3 id="get-session-list">🔒 GET /session/list</h3>

_Note: Lists all active WhatsApp sessions for the authenticated user._

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

_Note: Configures a specific WhatsApp group's permissions and targeting niche._

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
  "message": "Group 'Premium Offers Group' configured as 'coletor' successfully!"
}
```

---

<h3 id="get-curation-pending">🔒 GET /curation/pending</h3>

_Note: Fetches the list of products waiting for approval. Returns a pre-formatted WhatsApp message string._

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
    "formattedMessage": "🚨 *ACHADOS GARIMPEI* 🚨\n\n*Creatina Monohidratada 1kg Black Skull\*\n..."
  }
]
```

---

<h3 id="put-curation-edit">🔒 PUT /curation/pending/:id & /curation/approved/:id</h3>

_Note: Updates product information dynamically. To change texts only, send a JSON body. To upload a new image, send a `multipart/form-data` request with an `image` file field._

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
  "message": "Product updated successfully!",
  "product": {
    "id": 11,
    "title": "Updated Nike Shoes",
    "current_price": "199.90"
  }
}
```

---

<h3 id="post-curation-approve">🔒 POST /curation/approve/:id</h3>

_Note: Approves the product, assigns a niche, removes it from the pending queue, and applies the Anti-Duplication Upsert lock into the final dispatch table._

**_REQUEST BODY_**

```json
{
  "niche": "academia"
}
```

**_RESPONSE_**

```json
{
  "message": "Product approved and queued for successful shooting!",
  "product": {
    "id": 1,
    "title": "Creatina Monohidratada 1kg Black Skull",
    "status": "pending_dispatch"
  }
}
```

---

<h3 id="post-curation-send-now">🔒 POST /curation/send-now/:id</h3>

_Note: Instantly dispatches a pending product directly to the configured WhatsApp group, ignoring the cron interval and time windows._

**_RESPONSE_**

```json
{
  "message": "🔥 Disparo relâmpago realizado com sucesso!"
}
```

---

<h3 id="post-dispatch-config">🔒 POST /dispatch-config</h3>

_Note: Creates or updates a Dispatch Engine configuration (Upsert based on session and niche). Defines when and how often the worker should dispatch messages._

**_REQUEST BODY_**

```json
{
  "sessionId": "sessao_A",
  "niche": "academia",
  "intervalMinutes": 5,
  "window1Start": "08:00",
  "window1End": "12:00",
  "isPaused": false
}
```

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

<h3 id="delete-curation-reject">🔒 DELETE /curation/reject/:id & /curation/approved/:id</h3>

_Note: Rejects/Deletes a product, removing it permanently from the database and deleting the local image file._

**_RESPONSE_**

```json
{
  "message": "Product rejected and photo successfully removed."
}
```

<h2 id="colab-pt">🤝 Colaboradores</h2>

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

<h2 id="contribute-pt">📫 Contribuições</h2>

git checkout -b feature/sua-feature

Siga os padrões de commit (Conventional Commits).

Certifique-se de que os testes estão passando: npm test.

Abra um Pull Request detalhando as alterações.
