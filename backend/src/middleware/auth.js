const jwt = require('jsonwebtoken');

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado. Token no proporcionado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Admin "clásico" (login por email/contraseña) o cliente cuyo teléfono
    // está en la lista de administradores (ver config/roles.js). El claim
    // isAdmin solo lo pone el servidor al firmar el token de cliente, así
    // que confiar en él aquí no abre ninguna vía de escalado de privilegios.
    const isAdminUser = payload.role === 'admin' || (payload.role === 'customer' && payload.isAdmin === true);
    if (!isAdminUser) {
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
