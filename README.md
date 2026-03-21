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

Jest & Supertest (Unit and Integration testing)

Docker (Containerization for scalable deployment)

<h2 id="features">🧾 Key Features & Architecture</h2>

To ensure no messages are lost and the application scales, the orchestrator implements advanced backend patterns:

- **Asynchronous Event-Driven Engine:** Link ingestion and data extraction are decoupled. The WhatsApp listener instantly saves messages to an `ingestion_queue` (PostgreSQL), freeing the main thread, while a background Worker processes them at its own pace.
- **Transactional Queues:** Uses `FOR UPDATE SKIP LOCKED` in PostgreSQL to ensure robust queue orchestration. This prevents race conditions and guarantees that no two workers will process the same product link simultaneously.
- **Multi-Tenancy & Session Isolation:** Supports multiple WhatsApp accounts concurrently. Data is strictly isolated using `userId` relationships, verified via custom `authMiddleware` (`x-api-key` and `x-user-id`), ensuring users only access their own curated products.
- **Anti-Duplication Engine (Upsert):** Implements strict database-level locks on `(user_id, original_link)`. If an approved product already exists, the system automatically updates its price and discount, and re-queues it for dispatch, preventing group spamming.
- **Dynamic Message Formatter:** A built-in utility that generates WhatsApp-ready markdown previews (with strike-throughs, bold text, and emojis) dynamically, allowing frontends to display exact message previews before dispatch.

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

| route                                  | description                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>POST /session/start</kbd>         | initializes a WhatsApp session and links it to a userId in the database. [response details](#post-cookies-detail)                           |
| <kbd>GET /curation/pending</kbd>       | fetches all pending products for the authenticated user, including formatted WhatsApp previews. [response details](#post-amazon-api-detail) |
| <kbd>POST /curation/approve/:id</kbd>  | approves a product, applies the Anti-Duplication Lock, and moves it to the final dispatch queue.. [request details](#post-extract-detail)   |
| <kbd>DELETE /curation/reject/:id</kbd> | rejects and permanently removes a bad extraction from the database. [request details](#post-extract-detail)                                 |

**_Authentication & Headers_**

Note: Endponts marcados com 🔒 exigem autenticação. Você deve passar os seguintes cabeçalhos (Headers) na sua requisição HTTP:

```json
Content-Type: application/json
x-api-key: sua_chave_de_api
x-user-id: garimpei_user_01
```

<h3 id="post-session-start">POST /session/start</h3>

_Note: This endpoint initializes a WppConnect instance and links it to the user. Check the terminal to scan the QR Code._

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
  "message": "Session initialized. Please check the terminal to scan the QR Code.",
  "status": "qr_ready"
}
```

<h3 id="get-curation-pending">🔒 GET /curation/pending</h3>

_Note: Fetches the list of products waiting for approval. Returns a pre-formatted WhatsApp message string._

**_RESPONSE_**

```json
{
  "id": 11,
  "session_id": "sessao_A",
  "marketplace": "ML",
  "title": "Creatina Monohidratada 1kg Black Skull",
  "affiliate_link": "https://meli.la/2TetZ81",
  "original_price": "79.90",
  "current_price": "57.99",
  "discount": "27% OFF",
  "free_shipping": true,
  "sold_quantity": "+50 mil vendidos",
  "formattedMessage": "🚨 *ACHADOS GARIMPEI* 🚨\n\n*Creatina Monohidratada 1kg Black Skull*\n\nDe ~R$ 79,90~ |Por *R$ 57,99* 💵\n`🚚 FRETE GRÁTIS!`\n`🎟️ 27% OFF`\n\nAchado no Mercado Livre:\nhttps://meli.la/2TetZ81"
}
```

<h3 id="post-curation-approve">🔒 POST /curation/approve/:id</h3>

_Note: Approves the product, removes it from the pending queue, and applies the Anti-Duplication Upsert lock into the final dispatch table. Requires x-api-key and x-user-id in the headers._

**_RESPONSE_**

```json
{
  "message": "Produto aprovado e enfileirado para disparo com sucesso!",
  "product": {
    "id": 1,
    "title": "Creatina Monohidratada 1kg Black Skull",
    "status": "pending_dispatch"
  }
}
```

<h3 id="delete-curation-reject">🔒 DELETE /curation/reject/:id</h3>

_Note: Rejects a product, deleting it permanently from the pending database._

**_RESPONSE_**

```json
{
  "message": "Produto rejeitado e removido com sucesso."
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

Jest & Supertest (Testes unitários e de integração)

Docker (Containerização para deploy escalável)

<h2 id="features-pt">🧾 Principais Funcionalidades e Arquitetura</h2>

Para garantir que nenhuma mensagem seja perdida e que a aplicação escale, o orquestrador implementa padrões avançados de backend:

- **Motor Assíncrono Orientado a Eventos:** Ingestão de links e extração de dados são desacopladas. O listener do WhatsApp salva a mensagem instantaneamente em uma ingestion_queue (PostgreSQL), liberando a thread principal, enquanto um Worker em background processa os links no seu próprio ritmo.
- **Filas Transacionais:** Utiliza FOR UPDATE SKIP LOCKED no PostgreSQL para garantir uma orquestração de fila robusta. Isso previne condições de corrida (race conditions) e garante que dois workers nunca processem o mesmo link simultaneamente.
- **Multi-Tenancy e Isolamento de Sessão:** Suporta múltiplas contas de WhatsApp simultaneamente. Os dados são estritamente isolados utilizando relacionamentos de userId, verificados através de um authMiddleware (x-api-key e x-user-id), garantindo que os usuários só tenham acesso aos seus próprios produtos.
- **Motor Anti-Duplicidade (Upsert):** Implementa travas rigorosas a nível de banco de dados em (user_id, original_link). Se um produto aprovado já existir no banco final, o sistema atualiza automaticamente seu preço/desconto e o recoloca na fila de disparo, prevenindo flood (spam) em grupos.
- **Formatador Dinâmico de Mensagens:** Um utilitário integrado que gera previews dinâmicos em markdown perfeitamente compatíveis com o WhatsApp (com tachados, negritos e emojis), permitindo que o frontend exiba exatamente como a mensagem ficará antes do disparo.

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

Envie uma requisição POST para /session/start com seu userId e a sessionId desejada.

Verifique o terminal para ver o QR Code gerado.

Escaneie-o usando a função "Aparelhos Conectados" do seu aplicativo WhatsApp.

Envie qualquer link encurtado de marketplace (ex: meli.la/xxx) para o número conectado para acionar o worker de ingestão!

<h2 id="routes-pt">📍 API Endpoints</h2>

| route                                  | description                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>POST /session/start</kbd>         | initializes a WhatsApp session and links it to a userId in the database. [response details](#post-session-start)                            |
| <kbd>GET /curation/pending</kbd>       | fetches all pending products for the authenticated user, including formatted WhatsApp previews. [response details](#get-curation-pending)   |
| <kbd>POST /curation/approve/:id</kbd>  | approves a product, applies the Anti-Duplication Lock, and moves it to the final dispatch queue.. [request details](#post-curation-approve) |
| <kbd>DELETE /curation/reject/:id</kbd> | rejects and permanently removes a bad extraction from the database. [request details](#delete-curation-reject)                              |

**_Authentication & Headers_**

Note: Endpoints marcados com 🔒 exigem autenticação. Você deve passar os seguintes cabeçalhos (Headers) na sua requisição HTTP:

```json
Content-Type: application/json
x-api-key: sua_chave_de_api
x-user-id: garimpei_user_01
```

<h3 id="post-session-start">POST /session/start</h3>

_Note: Este endpoint inicializa uma instância do WppConnect e a vincula ao usuário. Verifique o terminal para escanear o QR Code._

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
  "message": "Session initialized. Please check the terminal to scan the QR Code.",
  "status": "qr_ready"
}
```

<h3 id="get-curation-pending">🔒 GET /curation/pending</h3>

_Note: Busca a lista de produtos aguardando curadoria. Retorna uma string de mensagem pré-formatada para o WhatsApp._

**_RESPONSE_**

```json
{
  "id": 11,
  "session_id": "sessao_A",
  "marketplace": "ML",
  "title": "Creatina Monohidratada 1kg Black Skull",
  "affiliate_link": "https://meli.la/2TetZ81",
  "original_price": "79.90",
  "current_price": "57.99",
  "discount": "27% OFF",
  "free_shipping": true,
  "sold_quantity": "+50 mil vendidos",
  "formattedMessage": "🚨 *ACHADOS GARIMPEI* 🚨\n\n*Creatina Monohidratada 1kg Black Skull*\n\nDe ~R$ 79,90~ |Por *R$ 57,99* 💵\n`🚚 FRETE GRÁTIS!`\n`🎟️ 27% OFF`\n\nAchado no Mercado Livre:\nhttps://meli.la/2TetZ81"
}
```

<h3 id="post-curation-approve">🔒 POST /curation/approve/:id</h3>

_Note: Aprova o produto, remove da fila de pendentes e aplica a trava de Anti-Duplicidade (Upsert) na tabela final de envios._

**_RESPONSE_**

```json
{
  "message": "Produto aprovado e enfileirado para disparo com sucesso!",
  "product": {
    "id": 1,
    "title": "Creatina Monohidratada 1kg Black Skull",
    "status": "pending_dispatch"
  }
}
```

<h3 id="delete-curation-reject">🔒 DELETE /curation/reject/:id</h3>

_Note: Rejeita um produto, apagando-o permanentemente do banco de dados de curadoria._

**_RESPONSE_**

```json
{
  "message": "Produto rejeitado e removido com sucesso."
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
