require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('../src/models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  const email = process.env.ADMIN_EMAIL || 'admin@peluqueria.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    console.log(`El administrador ${email} ya existe. No se realizan cambios.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ name: 'Administrador', email, passwordHash });

  console.log(`Administrador creado correctamente:`);
  console.log(`  Email: ${email}`);
  console.log(`  Contraseña: ${password}`);
  console.log('Recuerda cambiar la contraseña tras el primer inicio de sesión.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error al crear el administrador inicial:', err);
  process.exit(1);
});
