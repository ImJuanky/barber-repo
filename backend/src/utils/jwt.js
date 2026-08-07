const jwt = require('jsonwebtoken');
const { isAdminPhone } = require('../config/roles');

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function signCustomerToken(customer) {
  const payload = { sub: customer.id, name: customer.name, phone: customer.phone, role: 'customer' };

  // Si el teléfono del cliente está en la lista de administradores, se añade
  // el claim isAdmin al token. Se decide aquí, en el servidor, a partir del
  // teléfono ya verificado en BD — el cliente nunca puede auto-otorgárselo.
  if (isAdminPhone(customer.phone)) {
    payload.isAdmin = true;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    // Los clientes no deben tener que volver a iniciar sesión a menudo.
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '180d' }
  );
}

module.exports = { signAdminToken, signCustomerToken };
