const ALLOWED_ROLES = ["client", "bank", "admin", "asesor"];
const ALLOWED_RATE_TYPES = ["TEA", "TNA", "NOMINAL"];
const MAX_CREDIT_PERIODS = 120;
const MAX_SCHEDULE_ITEMS = 180;

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function isNonEmptyString(value, maxLength = 255) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function usernameFromBody(body) {
  return body.username || body.email;
}

function validateNumericParam(name) {
  return (req, res, next) => {
    if (!/^\d+$/.test(String(req.params[name] || ""))) {
      return badRequest(res, `Parametro ${name} invalido`);
    }
    return next();
  };
}

function validateTextParam(name, maxLength = 80) {
  return (req, res, next) => {
    const value = String(req.params[name] || "").trim();
    if (!value || value.length > maxLength || !/^[a-zA-Z0-9_-]+$/.test(value)) {
      return badRequest(res, `Parametro ${name} invalido`);
    }
    return next();
  };
}

function validateRegister(req, res, next) {
  const username = usernameFromBody(req.body);
  const { password } = req.body;

  if (!isNonEmptyString(username, 100) || !isNonEmptyString(password, 128)) {
    return badRequest(res, "Usuario y contrasena son obligatorios");
  }

  if (password.length < 8) {
    return badRequest(res, "La contrasena debe tener minimo 8 caracteres");
  }

  return next();
}

function validateLogin(req, res, next) {
  const username = usernameFromBody(req.body);
  const { password } = req.body;

  if (!isNonEmptyString(username, 100) || !isNonEmptyString(password, 128)) {
    return badRequest(res, "Usuario y contrasena son obligatorios");
  }

  return next();
}

function validateBootstrapAdmin(req, res, next) {
  const username = usernameFromBody(req.body);
  const { password } = req.body;

  if (!isNonEmptyString(username, 100) || !isNonEmptyString(password, 128)) {
    return badRequest(res, "Usuario y contrasena son obligatorios");
  }

  if (password.length < 10) {
    return badRequest(res, "La contrasena admin debe tener minimo 10 caracteres");
  }

  return next();
}

function validateRoleUpdate(req, res, next) {
  const { rol, bankId } = req.body;

  if (!ALLOWED_ROLES.includes(rol)) {
    return badRequest(res, "Rol no valido");
  }

  if (rol === "bank" && !isNonEmptyString(bankId, 50)) {
    return badRequest(res, "bankId es obligatorio para usuarios bank");
  }

  return next();
}

function validateBankUser(req, res, next) {
  const username = usernameFromBody(req.body);
  const { password, entityId, entityName, themeColor } = req.body;

  if (
    !isNonEmptyString(username, 100) ||
    !isNonEmptyString(password, 128) ||
    !isNonEmptyString(entityId, 50) ||
    !isNonEmptyString(entityName, 100)
  ) {
    return badRequest(res, "Correo, contrasena, entityId y entityName son obligatorios");
  }

  if (password.length < 8) {
    return badRequest(res, "La contrasena debe tener minimo 8 caracteres");
  }

  if (themeColor !== undefined && !isNonEmptyString(themeColor, 20)) {
    return badRequest(res, "themeColor invalido");
  }

  return next();
}

function validateChangePassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;

  if (!isNonEmptyString(currentPassword, 128) || !isNonEmptyString(newPassword, 128)) {
    return badRequest(res, "Todos los campos son obligatorios");
  }

  if (newPassword.length < 8) {
    return badRequest(res, "La nueva contrasena debe tener minimo 8 caracteres");
  }

  return next();
}

function validateSuspendUser(req, res, next) {
  const { reason } = req.body;

  if (reason !== undefined && !isNonEmptyString(reason, 255)) {
    return badRequest(res, "reason invalido");
  }

  return next();
}

function validateCreateEntity(req, res, next) {
  const { id, name, themeColor, bankUser } = req.body;

  if (!isNonEmptyString(id, 50) || !isNonEmptyString(name, 100)) {
    return badRequest(res, "id y name son obligatorios");
  }

  if (themeColor !== undefined && !isNonEmptyString(themeColor, 20)) {
    return badRequest(res, "themeColor invalido");
  }

  if (bankUser) {
    if (!isNonEmptyString(bankUser.username, 100) || !isNonEmptyString(bankUser.password, 128)) {
      return badRequest(res, "bankUser.username y bankUser.password son obligatorios");
    }
    if (bankUser.password.length < 8) {
      return badRequest(res, "La contrasena del banco debe tener minimo 8 caracteres");
    }
  }

  return next();
}

function validateUpdateEntity(req, res, next) {
  const { name, themeColor, isSuspended } = req.body;

  if (name === undefined && themeColor === undefined && isSuspended === undefined) {
    return badRequest(res, "No hay campos para actualizar");
  }

  if (name !== undefined && !isNonEmptyString(name, 100)) {
    return badRequest(res, "name invalido");
  }

  if (themeColor !== undefined && !isNonEmptyString(themeColor, 20)) {
    return badRequest(res, "themeColor invalido");
  }

  if (isSuspended !== undefined && typeof isSuspended !== "boolean") {
    return badRequest(res, "isSuspended debe ser boolean");
  }

  return next();
}

function validateProductPayload(req, res, next) {
  const body = req.body;

  if (body.name !== undefined && !isNonEmptyString(body.name, 100)) {
    return badRequest(res, "name invalido");
  }

  if (body.rateType !== undefined && !ALLOWED_RATE_TYPES.includes(String(body.rateType).toUpperCase())) {
    return badRequest(res, "rateType invalido");
  }

  const numericFields = [
    "rateValue",
    "capitalization",
    "desgravamenRate",
    "vehicularInsurancePercentage",
    "portesValue"
  ];

  for (const field of numericFields) {
    if (body[field] !== undefined && !isNonNegativeNumber(body[field])) {
      return badRequest(res, `${field} invalido`);
    }
  }

  if (body.promotions !== undefined && !Array.isArray(body.promotions)) {
    return badRequest(res, "promotions debe ser un arreglo");
  }

  if (Array.isArray(body.promotions) && body.promotions.length > 50) {
    return badRequest(res, "promotions excede el limite permitido");
  }

  return next();
}

function validateSimulation(req, res, next) {
  const body = req.body;
  const vehiclePrice = body.vehiclePrice ?? body.precioVehiculo;
  const periods = body.periods ?? body.plazoMeses;
  const rateValue = body.rateValue ?? body.tasaInteres;
  const graceTotal = Number(body.gracePeriodsTotal ?? body.plazoGraciaTotal ?? 0);
  const gracePartial = Number(body.gracePeriodsPartial ?? body.plazoGraciaParcial ?? 0);
  const downPaymentPercentage = Number(body.downPaymentPercentage ?? 20);

  if (!isPositiveNumber(vehiclePrice) || !isPositiveNumber(periods) || !isPositiveNumber(rateValue)) {
    return badRequest(res, "vehiclePrice, periods y rateValue deben ser mayores a 0");
  }

  if (Number(periods) > MAX_CREDIT_PERIODS) {
    return badRequest(res, `periods no puede ser mayor a ${MAX_CREDIT_PERIODS}`);
  }

  if (!Number.isInteger(Number(periods))) {
    return badRequest(res, "periods debe ser entero");
  }

  if (graceTotal < 0 || gracePartial < 0 || graceTotal + gracePartial >= Number(periods)) {
    return badRequest(res, "Periodos de gracia invalidos");
  }

  if (downPaymentPercentage < 0 || downPaymentPercentage > 100) {
    return badRequest(res, "downPaymentPercentage debe estar entre 0 y 100");
  }

  return next();
}

function validateSaveSimulation(req, res, next) {
  const schedule = req.body.schedule || req.body.simulation?.schedule || [];

  if (schedule !== undefined && (!Array.isArray(schedule) || schedule.length > MAX_SCHEDULE_ITEMS)) {
    return badRequest(res, "schedule invalido o excede el limite permitido");
  }

  return next();
}

module.exports = {
  validateNumericParam,
  validateTextParam,
  validateRegister,
  validateLogin,
  validateBootstrapAdmin,
  validateRoleUpdate,
  validateBankUser,
  validateChangePassword,
  validateSuspendUser,
  validateCreateEntity,
  validateUpdateEntity,
  validateProductPayload,
  validateSimulation,
  validateSaveSimulation
};
