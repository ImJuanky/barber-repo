function notFoundHandler(req, res, next) {
  res.status(404).json({ message: 'Recurso no encontrado.' });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'El recurso ya existe o está duplicado.' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Datos inválidos.', errors: err.errors?.map(e => e.message) });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno del servidor.'
  });
}

module.exports = { notFoundHandler, errorHandler };
