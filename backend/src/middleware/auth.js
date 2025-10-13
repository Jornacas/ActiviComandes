/**
 * Middleware de autenticación
 * Verifica el token de autenticación en requests
 */

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'comanda_materials_2024';

function authenticateRequest(req, res, next) {
  // El token puede venir en:
  // 1. Query parameter: ?token=xxx
  // 2. Body: { token: 'xxx' }
  // 3. Header: Authorization: Bearer xxx

  const tokenFromQuery = req.query.token;
  const tokenFromBody = req.body.token;
  const tokenFromHeader = req.headers.authorization?.replace('Bearer ', '');

  const token = tokenFromQuery || tokenFromBody || tokenFromHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación requerido'
    });
  }

  if (token !== AUTH_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Token de autenticación inválido'
    });
  }

  // Token válido, continuar
  next();
}

module.exports = { authenticateRequest };
