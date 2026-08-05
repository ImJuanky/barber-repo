const jwt = require('jsonwebtoken');

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function signCustomerToken(customer) {
  return jwt.sign(
    { sub: customer.id, name: customer.name, phone: customer.phone, role: 'customer' },
    process.env.JWT_SECRET,
    // Los clientes no deben tener que volver a iniciar sesión a menudo.
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '180d' }
  );
}

module.exports = { signAdminToken, signCustomerToken };
