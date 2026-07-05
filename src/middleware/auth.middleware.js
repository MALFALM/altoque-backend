const jwt = require("jsonwebtoken");

function getToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7);
}

function verifyToken(req, res, next, { optional = false } = {}) {
  const token = getToken(req);

  if (!token) {
    if (optional) return next();
    return res.status(401).json({
      success: false,
      message: "Token de autenticacion requerido"
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Token invalido o expirado"
    });
  }
}

function authenticateToken(req, res, next) {
  return verifyToken(req, res, next);
}

function optionalAuth(req, res, next) {
  return verifyToken(req, res, next, { optional: true });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autenticacion requerida"
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para esta accion"
      });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  authorizeRoles
};
