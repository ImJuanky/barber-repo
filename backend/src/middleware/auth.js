const jwt = require('jsonwebtoken');

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado. Token no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Inicia sesión para continuar.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'customer') {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }
    req.customer = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' });
  }
}

module.exports = { requireAdminAuth, requireCustomerAuth };
