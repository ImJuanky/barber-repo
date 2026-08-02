const bcrypt = require('bcryptjs');
const { Admin } = require('../models');
const { signAdminToken } = require('../utils/jwt');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const token = signAdminToken(admin);
    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const admin = await Admin.findByPk(req.admin.sub, {
      attributes: ['id', 'name', 'email']
    });
    if (!admin) return res.status(404).json({ message: 'Administrador no encontrado.' });
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
