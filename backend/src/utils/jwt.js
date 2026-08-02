const jwt = require('jsonwebtoken');

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { signAdminToken };
