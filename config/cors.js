/**
 * Configuração do CORS
 * Este arquivo centraliza as configurações do CORS para diferentes ambientes
 */

const corsConfig = {
  development: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  production: {
    origin: ['https://barber-shop-ten-mu.vercel.app', 'https://barber.targetweb.tech'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  test: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
};

// Determinar o ambiente atual
const env = process.env.NODE_ENV || 'development';
const config = corsConfig[env];

if (!config) {
  throw new Error(`Configuração de CORS não encontrada para o ambiente: ${env}`);
}

module.exports = config;