const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const { limitRepeatedRequests } = require('../middleware/requestLimitMiddleware');

// Middleware para logar todas as requisições de serviços
const logServiceRequests = (req, res, next) => {
  const requestId = Date.now();
  const endpoint = req.originalUrl;
  const method = req.method;
  
  console.log(`[${new Date().toISOString()}] [SERVICE-ROUTE:${requestId}] ${method} ${endpoint} - INÍCIO`);
  
  // Capturar o momento em que a resposta é enviada
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${new Date().toISOString()}] [SERVICE-ROUTE:${requestId}] ${method} ${endpoint} - FIM (status: ${res.statusCode})`);
    return originalSend.call(this, body);
  };
  
  next();
};

// Aplicar middleware de logging a todas as rotas
router.use(logServiceRequests);

// Configuração do limitador de chamadas repetidas
const repeatedRequestLimiter = limitRepeatedRequests({
  maxRepeatedRequests: 3, // Limita a 3 chamadas idênticas
  blockTimeMs: 300000, // Bloqueia por 5 minutos (300000ms)
  message: {
    success: false,
    message: 'Muitas requisições idênticas. Esta operação está temporariamente bloqueada.'
  }
});

// Rotas públicas com limitador de chamadas repetidas
router.get('/', repeatedRequestLimiter, serviceController.getAllServices);
router.get('/barber/:barberId', repeatedRequestLimiter, serviceController.getServicesByBarber);
router.get('/:id', repeatedRequestLimiter, serviceController.getServiceById);

// Rotas protegidas (requerem autenticação) com limitador de chamadas repetidas
router.post('/', authMiddleware.protect, repeatedRequestLimiter, serviceController.createService);
router.patch('/:id', authMiddleware.protect, repeatedRequestLimiter, serviceController.updateService);
router.delete('/:id', authMiddleware.protect, repeatedRequestLimiter, serviceController.deleteService);
router.post('/:id/barbers', authMiddleware.protect, repeatedRequestLimiter, serviceController.associateBarbers);

module.exports = router;