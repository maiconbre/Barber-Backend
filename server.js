const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./models/database');
const User = require('./models/User');
const Barber = require('./models/Barber');
const Appointment = require('./models/Appointment');
const Service = require('./models/Service');
const authController = require('./controllers/authController');
// Importamos apenas para manter compatibilidade, mas não usaremos globalmente
const { createRateLimiter } = require('./middleware/rateLimitMiddleware');
// Importamos o novo limitador de chamadas repetidas
const { limitRepeatedRequests } = require('./middleware/requestLimitMiddleware');

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');
const barberRoutes = require('./routes/barberRoutes');
const commentRoutes = require('./routes/commentRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();

// Importar configuração do CORS
const corsConfig = require('./config/cors');

// Configuração do CORS baseada no ambiente atual
app.use(cors(corsConfig));

// Middleware para processar JSON
app.use(express.json());

// Middleware para adicionar headers de segurança
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Middleware global para logar todas as requisições HTTP
app.use((req, res, next) => {
  // Ignorar requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const requestId = Date.now();
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('user-agent') || 'unknown';
  
  console.log(`[${new Date().toISOString()}] [HTTP:${requestId}] ${method} ${url} - INÍCIO - IP: ${ip} - User-Agent: ${userAgent}`);
  
  // Interceptar a finalização da resposta
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${new Date().toISOString()}] [HTTP:${requestId}] ${method} ${url} - FIM - Status: ${status} - Duração: ${duration}ms`);
  });
  
  next();
});

// Removemos o rate limiter global, pois agora temos limitadores específicos por rota
// que controlam chamadas repetidas com base no conteúdo da requisição
// Isso oferece uma proteção mais eficaz contra abusos específicos

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de usuário
app.use('/api/users', userRoutes);

// Rotas de barbeiro
app.use('/api/barbers', barberRoutes);

// Rotas de comentários
app.use('/api/comments', commentRoutes);

// Rotas de agendamentos
app.use('/api/appointments', appointmentRoutes);

// Rotas de serviços
app.use('/api/services', serviceRoutes);

// Rota principal para documentação da API
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bem-vindo à API da Barbearia',
    description: 'Esta API fornece serviços para gerenciamento de barbearia, incluindo agendamentos, barbeiros, usuários e comentários.',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        routes: {
          'POST /login': 'Autenticação de usuários',
          'POST /validate-token': 'Validação de token JWT',
          'POST /register': 'Registro de novos usuários (requer autenticação de admin)',
          'POST /verify-admin': 'Verificação de senha de administrador',
          'GET /users': 'Listar todos os usuários (apenas para depuração)'
        }
      },
      users: {
        base: '/api/users',
        routes: {
          'GET /': 'Listar todos os usuários',
          'GET /:id': 'Obter usuário por ID',
          'PATCH /:id': 'Atualizar usuário',
          'POST /change-password': 'Alterar senha do usuário'
        }
      },
      barbers: {
        base: '/api/barbers',
        routes: {
          'GET /': 'Listar todos os barbeiros',
          'GET /:id': 'Obter barbeiro por ID',
          'POST /': 'Criar novo barbeiro (requer autenticação)',
          'PUT /:id': 'Atualizar barbeiro (requer autenticação)',
          'DELETE /:id': 'Excluir barbeiro (requer autenticação)'
        }
      },
      appointments: {
        base: '/api/appointments',
        routes: {
          'GET /': 'Listar todos os agendamentos',
          'POST /': 'Criar novo agendamento',
          'PATCH /:id': 'Atualizar status do agendamento',
          'DELETE /:id': 'Excluir agendamento'
        }
      },
      comments: {
        base: '/api/comments',
        routes: {
          'GET /': 'Listar comentários (filtrados por status)',
          'GET /admin': 'Listar todos os comentários (requer autenticação de admin)',
          'POST /': 'Criar novo comentário',
          'PATCH /:id': 'Atualizar status do comentário',
          'DELETE /:id': 'Excluir comentário'
        }
      },
      services: {
        base: '/api/services',
        routes: {
          'GET /': 'Listar todos os serviços',
          'GET /:id': 'Obter serviço por ID',
          'GET /barber/:barberId': 'Obter serviços por barbeiro',
          'POST /': 'Criar novo serviço (requer autenticação)',
          'PATCH /:id': 'Atualizar serviço (requer autenticação)',
          'DELETE /:id': 'Excluir serviço (requer autenticação)',
          'POST /:id/barbers': 'Associar barbeiros a um serviço (requer autenticação)'
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Rota para lidar com rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Inicialização do banco de dados e do servidor
const initDatabase = async () => {
  try {
    // Sincronizar o banco de dados sem forçar a recriação das tabelas
    await sequelize.sync({ force: false });
    console.log('Banco de dados sincronizado');

    // Seed inicial de usuários, se necessário
    const usersCount = await User.count();
    if (usersCount === 0) {
      await authController.seedUsers();
    } else {
      console.log(`Já existem ${usersCount} usuários no banco de dados.`);
    }

    // Inicia o servidor utilizando o HOST e PORT definidos
    app.listen(PORT, HOST, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  }
};

initDatabase();

// Exportar o app para ser usado em start.js
module.exports = app;
