const app = require('./app')
const ingestionWorker = require('./workers/ingestionWorker');
const dispatchWorker = require('./workers/dispatchWorker');

ingestionWorker.start();
dispatchWorker.start();

const PORT = process.env.PORT || 3002;

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Closing safely...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`⚙️ Back-end rodando em ${PORT}`);
})


