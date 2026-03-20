const app = require('./app')
const ingestionWorker = require('./workers/ingestionWorker');

ingestionWorker.start();

const PORT = process.env.PORT || 3002;

process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM. Encerrando com segurança...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`⚙️ Back-end rodando em ${PORT}`);
})


