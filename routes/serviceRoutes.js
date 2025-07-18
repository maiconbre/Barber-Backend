const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');

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

// Rotas públicas
router.get('/', serviceController.getAllServices);
router.get('/barber/:barberId', serviceController.getServicesByBarber);
router.get('/:id', serviceController.getServiceById);

// Rotas protegidas (requerem autenticação)
router.post('/', authMiddleware.protect, serviceController.createService);
router.patch('/:id', authMiddleware.protect, serviceController.updateService);
router.delete('/:id', authMiddleware.protect, serviceController.deleteService);
router.post('/:id/barbers', authMiddleware.protect, serviceController.associateBarbers);

module.exports = router;