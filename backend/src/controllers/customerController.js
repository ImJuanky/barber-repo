const bcrypt = require('bcryptjs');
const { Customer } = require('../models');
const { signCustomerToken } = require('../utils/jwt');
const { normalizeSpanishPhone } = require('../utils/phone');
const { isAdminPhone } = require('../config/roles');

function toPublicCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    isAdmin: isAdminPhone(customer.phone)
  };
}

// POST /api/customers/register  { name, phone, password }  (público)
async function register(req, res, next) {
  try {
    const { name, password } = req.body;
    const phone = normalizeSpanishPhone(req.body.phone);

    const existing = await Customer.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: 'Ya existe una cuenta con ese número de teléfono. Inicia sesión.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await Customer.create({ name: name.trim(), phone, passwordHash });

    const token = signCustomerToken(customer);
    res.status(201).json({
      token,
      customer: toPublicCustomer(customer)
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/customers/login  { phone, password }  (público)
async function login(req, res, next) {
  try {
    const phone = normalizeSpanishPhone(req.body.phone);
    const { password } = req.body;

    const customer = await Customer.findOne({ where: { phone } });
    if (!customer) {
      return res.status(401).json({ message: 'Teléfono o contraseña incorrectos.' });
    }

    const isValid = await bcrypt.compare(password, customer.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Teléfono o contraseña incorrectos.' });
    }

    const token = signCustomerToken(customer);
    res.json({
      token,
      customer: toPublicCustomer(customer)
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/me  (requiere sesión de cliente)
async function me(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.customer.sub, {
      attributes: ['id', 'name', 'phone']
    });
    if (!customer) return res.status(404).json({ message: 'Cliente no encontrado.' });
    res.json({ customer: toPublicCustomer(customer) });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
