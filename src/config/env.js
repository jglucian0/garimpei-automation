require('dotenv').config();

const requiredEnvs = ['DATABASE_URL', 'GARIMPEI_API_URL', 'GARIMPEI_API_KEY'];

requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    console.error(`[Config] FATAL ERROR: Environment variable ${env} not defined!`);
    process.exit(1);
  }
});

module.exports = {
  port: process.env.PORT || 3002,
  databaseUrl: process.env.DATABASE_URL,
  garimpeiApiUrl: process.env.GARIMPEI_API_URL,
  garimpeiApiKey: process.env.GARIMPEI_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development'
};