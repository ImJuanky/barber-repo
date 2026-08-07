// Números de teléfono (formato normalizado ES: 9 dígitos, ver utils/phone.js)
// a los que se les concede acceso de administrador ADEMÁS de los
// administradores gestionados en la tabla `admins` (login por email).
//
// Esto NO crea un sistema de permisos paralelo: el teléfono solo obtiene el
// claim `isAdmin` en su propio token de cliente (ver utils/jwt.js), y el
// middleware requireAdminAuth (middleware/auth.js) es el único sitio que
// decide si una petición tiene acceso de administrador.
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '625304333')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

function isAdminPhone(phone) {
  return !!phone && ADMIN_PHONES.includes(phone);
}

module.exports = { ADMIN_PHONES, isAdminPhone };
