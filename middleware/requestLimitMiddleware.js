const crypto = require('crypto');

// Armazenamento para controlar requisições repetidas
const requestCache = new Map();
const userSessionCache = new Map();

/**
 * Middleware inteligente para limitar chamadas repetidas
 * Usa janelas de tempo deslizantes e detecção de padrões para otimizar UX
 */
const limitRepeatedRequests = (options = {}) => {
  // Configurações padrão otimizadas
  const config = {
    maxRepeatedRequests: options.maxRepeatedRequests || 100, // Limite base aumentado
    burstLimit: options.burstLimit || 20, // Limite para rajadas rápidas
    windowMs: options.windowMs || 60000, // Janela de 1 minuto
    blockTimeMs: options.blockTimeMs || 120000, // Bloqueio reduzido para 2 minutos
    gracePeriodMs: options.gracePeriodMs || 5000, // Período de graça de 5s
    message: options.message || {
      success: false,
      message: 'Muitas requisições em pouco tempo. Aguarde um momento antes de tentar novamente.'
    }
  };

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    
    // Gera identificadores para diferentes níveis de controle
    const requestData = {
      method: req.method,
      url: req.originalUrl.split('?')[0], // Remove query params para agrupar melhor
      // Só inclui body para operações que modificam dados
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? JSON.stringify(req.body) : ''
    };
    
    const requestHash = crypto
      .createHash('md5')
      .update(`${ip}-${JSON.stringify(requestData)}`)
      .digest('hex');
    
    const sessionKey = `session-${ip}`;
    const requestKey = `request-${ip}-${requestHash}`;
    
    // Gerencia sessão do usuário para detectar padrões
    if (!userSessionCache.has(sessionKey)) {
      userSessionCache.set(sessionKey, {
        requests: [],
        totalRequests: 0,
        firstSeen: now,
        lastActivity: now,
        isLegitimate: true
      });
    }
    
    const session = userSessionCache.get(sessionKey);
    session.lastActivity = now;
    session.totalRequests += 1;
    
    // Remove requisições antigas da janela deslizante
    session.requests = session.requests.filter(req => now - req.timestamp < config.windowMs);
    session.requests.push({ timestamp: now, hash: requestHash });
    
    // Análise inteligente de padrões
    const recentRequests = session.requests.length;
    const uniqueRequests = new Set(session.requests.map(r => r.hash)).size;
    const repetitionRatio = recentRequests > 0 ? (recentRequests - uniqueRequests) / recentRequests : 0;
    const avgInterval = recentRequests > 1 ? 
      (session.requests[session.requests.length - 1].timestamp - session.requests[0].timestamp) / (recentRequests - 1) : 
      config.gracePeriodMs;
    
    // Detecção de comportamento suspeito
    const isSuspicious = (
      repetitionRatio > 0.7 || // Mais de 70% de requisições repetidas
      avgInterval < 100 || // Menos de 100ms entre requisições
      recentRequests > config.burstLimit // Muitas requisições em rajada
    );
    
    // Atualiza status de legitimidade
    if (isSuspicious && session.isLegitimate) {
      session.isLegitimate = false;
    } else if (!isSuspicious && recentRequests < 5) {
      session.isLegitimate = true;
    }
    
    // Controle específico por requisição
    if (!requestCache.has(requestKey)) {
      requestCache.set(requestKey, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
        blockExpires: 0,
        timestamps: [now]
      });
      userSessionCache.set(sessionKey, session);
      return next();
    }
    
    const record = requestCache.get(requestKey);
    
    // Verifica se está bloqueado
    if (record.blocked && now < record.blockExpires) {
      const remainingTime = Math.ceil((record.blockExpires - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Aguarde ${remainingTime}s antes de tentar novamente.`,
        retryAfter: remainingTime
      });
    }
    
    // Remove timestamps antigos
    record.timestamps = record.timestamps.filter(t => now - t < config.windowMs);
    record.timestamps.push(now);
    record.count = record.timestamps.length;
    record.lastRequest = now;
    
    // Lógica inteligente de bloqueio
    let shouldBlock = false;
    let blockReason = '';
    
    if (session.isLegitimate) {
      // Usuário legítimo: limites mais generosos
      if (record.count > config.maxRepeatedRequests) {
        shouldBlock = true;
        blockReason = 'Limite de requisições atingido';
      }
    } else {
      // Comportamento suspeito: limites mais restritivos
      if (record.count > config.burstLimit || 
          (record.timestamps.length > 1 && 
           (now - record.timestamps[record.timestamps.length - 2]) < config.gracePeriodMs)) {
        shouldBlock = true;
        blockReason = 'Comportamento suspeito detectado';
      }
    }
    
    if (shouldBlock) {
      record.blocked = true;
      record.blockExpires = now + config.blockTimeMs;
      requestCache.set(requestKey, record);
      
      return res.status(429).json({
        success: false,
        message: config.message.message,
        retryAfter: Math.ceil(config.blockTimeMs / 1000),
        reason: blockReason
      });
    }
    
    // Reset do bloqueio se expirou
    if (record.blocked && now >= record.blockExpires) {
      record.blocked = false;
    }
    
    requestCache.set(requestKey, record);
    userSessionCache.set(sessionKey, session);
    next();
  };
};

// Sistema inteligente de limpeza de cache
const cleanupCache = () => {
  const now = Date.now();
  const maxAge = 3600000; // 1 hora
  const sessionMaxAge = 7200000; // 2 horas para sessões
  
  // Limpa cache de requisições
  let requestsRemoved = 0;
  for (const [key, record] of requestCache.entries()) {
    if (now - record.lastRequest > maxAge) {
      requestCache.delete(key);
      requestsRemoved++;
    }
  }
  
  // Limpa cache de sessões
  let sessionsRemoved = 0;
  for (const [key, session] of userSessionCache.entries()) {
    if (now - session.lastActivity > sessionMaxAge) {
      userSessionCache.delete(key);
      sessionsRemoved++;
    }
  }
  
  // Log de limpeza (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development' && (requestsRemoved > 0 || sessionsRemoved > 0)) {
    console.log(`[CACHE-CLEANUP] Removidos: ${requestsRemoved} requests, ${sessionsRemoved} sessions`);
  }
};

// Executa limpeza a cada 30 minutos
setInterval(cleanupCache, 1800000);

// Limpeza inicial após 5 minutos
setTimeout(cleanupCache, 300000);

module.exports = { limitRepeatedRequests };