const crypto = require('crypto');

// Armazenamento para controlar requisições repetidas
const requestCache = new Map();

/**
 * Middleware para limitar chamadas repetidas ao mesmo endpoint
 * Limita a 3 chamadas idênticas e bloqueia por 5 minutos após exceder o limite
 */
const limitRepeatedRequests = (options = {}) => {
  // Configurações padrão
  const config = {
    maxRepeatedRequests: options.maxRepeatedRequests || 30, // 3 requisições idênticas padrão
    blockTimeMs: options.blockTimeMs || 300000, // 5 minutos (300000ms) padrão
    message: options.message || {
      success: false,
      message: 'Muitas requisições idênticas. Esta operação está temporariamente bloqueada.'
    }
  };

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Gera um hash único baseado no endpoint, método e parâmetros da requisição
    const requestData = {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      // Incluímos apenas alguns campos do body para evitar problemas com tokens ou dados sensíveis
      body: req.method !== 'GET' ? JSON.stringify(req.body) : ''
    };
    
    const requestHash = crypto
      .createHash('md5')
      .update(`${ip}-${JSON.stringify(requestData)}`)
      .digest('hex');
    
    const now = Date.now();
    const cacheKey = `${ip}-${requestHash}`;
    
    // Inicializa o registro para esta requisição se não existir
    if (!requestCache.has(cacheKey)) {
      requestCache.set(cacheKey, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
        blockExpires: 0
      });
      return next();
    }
    
    const record = requestCache.get(cacheKey);
    
    // Verifica se a requisição está bloqueada
    if (record.blocked) {
      if (now < record.blockExpires) {
        // Ainda está no período de bloqueio
        const remainingTime = Math.ceil((record.blockExpires - now) / 60000); // Converte para minutos
        return res.status(429).json({
          success: false,
          message: `Muitas requisições idênticas. Esta operação está bloqueada por mais ${remainingTime} minutos.`
        });
      } else {
        // Período de bloqueio terminou, reseta o contador
        record.blocked = false;
        record.count = 1;
        record.firstRequest = now;
        record.lastRequest = now;
        requestCache.set(cacheKey, record);
        return next();
      }
    }
    
    // Atualiza o contador e o timestamp da última requisição
    record.count += 1;
    record.lastRequest = now;
    
    // Verifica se excedeu o limite de requisições repetidas
    if (record.count > config.maxRepeatedRequests) {
      // Bloqueia a requisição pelo tempo configurado
      record.blocked = true;
      record.blockExpires = now + config.blockTimeMs;
      requestCache.set(cacheKey, record);
      
      return res.status(429).json(config.message);
    }
    
    requestCache.set(cacheKey, record);
    next();
  };
};

// Limpa o armazenamento periodicamente para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCache.entries()) {
    // Remove registros mais antigos que 6 horas
    if (now - record.lastRequest > 21600000) { // 6 horas
      requestCache.delete(key);
    }
  }
}, 3600000); // Limpa a cada hora

module.exports = { limitRepeatedRequests };