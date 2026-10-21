const { ZodError } = require('zod');
const multer = require('multer');

const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: issues[0]?.message || 'Invalid input.', errors: issues });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller.' : err.message;
    return res.status(400).json({ message: msg });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field === 'studentId' ? 'Student ID' : field} is already in use.` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[UNIFIX] Server error:', err);
  res.status(status).json({ message: err.expose ? err.message : 'Something went wrong on the server.' });
};

module.exports = { notFound, errorHandler };
