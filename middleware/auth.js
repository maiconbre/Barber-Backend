const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    // Check Authorization header format
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Formato de autorização inválido' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    // Verify token and add user info to request
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info and token to request for use in routes
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
}

module.exports = authMiddleware;