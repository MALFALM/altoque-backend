const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const PUBLIC_ROLE = "client";
const ALLOWED_ROLES = ["client", "bank", "admin", "asesor"];

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function buildTokenPayload(user) {
  return {
    id_user: user.id_user,
    username: user.username,
    rol: user.rol,
    bankId: user.id_entidad_financiera || null
  };
}

function publicUser(user) {
  return {
    id_user: user.id_user,
    username: user.username,
    rol: user.rol,
    role: user.rol,
    bankId: user.id_entidad_financiera || null,
    bankName: user.bankName || null,
    estado_cuenta: Boolean(user.estado_cuenta)
  };
}

const register = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username || req.body.email);
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Usuario y contrasena son obligatorios" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La contrasena debe tener minimo 8 caracteres" });
    }

    const [existingUsers] = await pool.query(
      "SELECT id_user FROM User WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "El usuario ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO User (username, password_hash, rol, estado_cuenta) VALUES (?, ?, ?, ?)",
      [username, passwordHash, PUBLIC_ROLE, true]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      userId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno al registrar usuario" });
  }
};

const login = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username || req.body.email);
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Usuario y contrasena son obligatorios" });
    }

    const [users] = await pool.query(
      `SELECT u.*, e.nombre AS bankName
       FROM User u
       LEFT JOIN EntidadFinanciera e ON u.id_entidad_financiera = e.id_entidad_financiera
       WHERE u.username = ? AND u.estado_cuenta = true`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({
      message: "Login exitoso",
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno al iniciar sesion" });
  }
};

const bootstrapAdmin = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username || req.body.email);
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Usuario y contrasena son obligatorios" });
    }

    if (password.length < 10) {
      return res.status(400).json({ message: "La contrasena admin debe tener minimo 10 caracteres" });
    }

    const [[adminCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM User WHERE rol = 'admin'"
    );

    if (adminCount.total > 0) {
      return res.status(409).json({ message: "Ya existe un administrador configurado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO User (username, password_hash, rol, estado_cuenta) VALUES (?, ?, 'admin', true)",
      [username, passwordHash]
    );

    return res.status(201).json({
      message: "Administrador inicial creado correctamente",
      userId: result.insertId
    });
  } catch (error) {
    console.error("Error al crear admin inicial:", error);
    return res.status(500).json({ message: "Error al crear admin inicial", error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id_user, u.username, u.rol, u.estado_cuenta, u.created_at,
              e.id_entidad_financiera AS bankId, e.nombre AS bankName
       FROM User u
       LEFT JOIN EntidadFinanciera e ON u.id_entidad_financiera = e.id_entidad_financiera
       ORDER BY u.id_user DESC`
    );

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({ success: false, message: "Error al listar usuarios", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, bankId } = req.body;

    if (!rol) {
      return res.status(400).json({ message: "El rol es obligatorio" });
    }

    if (!ALLOWED_ROLES.includes(rol)) {
      return res.status(400).json({ message: "Rol no valido" });
    }

    const entityId = rol === "bank" ? (bankId || null) : null;
    const [result] = await pool.query(
      "UPDATE User SET rol = ?, id_entidad_financiera = ? WHERE id_user = ?",
      [rol, entityId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Rol actualizado correctamente", id_user: id, rol, bankId: entityId });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    res.status(500).json({ message: "Error al actualizar rol", error: error.message });
  }
};

const createBankUser = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const username = normalizeUsername(req.body.username || req.body.email);
    const { password, entityId, entityName, themeColor = "#0f172a" } = req.body;

    if (!username || !password || !entityId || !entityName) {
      return res.status(400).json({ message: "Correo, contrasena, entityId y entityName son obligatorios" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La contrasena debe tener minimo 8 caracteres" });
    }

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO EntidadFinanciera (id_entidad_financiera, nombre, theme_color, estado)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), theme_color = VALUES(theme_color)`,
      [entityId, entityName, themeColor]
    );

    const [existingUsers] = await connection.query(
      "SELECT id_user FROM User WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Ya existe una cuenta con ese correo" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      "INSERT INTO User (username, password_hash, rol, estado_cuenta, id_entidad_financiera) VALUES (?, ?, 'bank', true, ?)",
      [username, passwordHash, entityId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Banco creado correctamente",
      user: {
        id_user: result.insertId,
        username,
        rol: "bank",
        bankId: entityId,
        bankName: entityName,
        estado_cuenta: true
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al crear banco:", error);
    return res.status(500).json({ message: "Error al crear banco", error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  register,
  login,
  bootstrapAdmin,
  getUsers,
  updateUserRole,
  createBankUser
};
