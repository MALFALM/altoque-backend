const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const register = async (req, res) => {
  try {
    const { username, password, rol = "client" } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Usuario y contraseña son obligatorios"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "La contraseña debe tener mínimo 8 caracteres"
      });
    }

    const [existingUsers] = await pool.query(
      "SELECT id_user FROM User WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "El usuario ya existe"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO User (username, password_hash, rol, estado_cuenta) VALUES (?, ?, ?, ?)",
      [username, passwordHash, rol, true]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      userId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error interno al registrar usuario"
    });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Usuario y contraseña son obligatorios"
      });
    }

    const [users] = await pool.query(
  `
  SELECT 
    id_user,
    username,
    password_hash,
    rol,
    estado_cuenta,
    suspension_until,
    suspension_reason,
    display_name
  FROM \`User\`
  WHERE username = ?
  `,
  [username]
);

    if (users.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const user = users[0];

    if (!user.estado_cuenta) {
  if (
    user.suspension_until &&
    new Date(user.suspension_until) <= new Date()
  ) {
    await pool.query(
      `
      UPDATE \`User\`
      SET estado_cuenta = true,
          suspension_until = NULL,
          suspension_reason = NULL
      WHERE id_user = ?
      `,
      [user.id_user]
    );

    user.estado_cuenta = true;
  } else {
    return res.status(403).json({
      message: "Tu cuenta se encuentra suspendida temporalmente"
    });
  }
}

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        username: user.username,
        rol: user.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id_user: user.id_user,
        username: user.username,
        rol: user.rol,
        display_name: user.display_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error interno al iniciar sesión"
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id_user, username, rol, estado_cuenta, created_at, display_name FROM `User`"
    );

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar usuarios",
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const allowedRoles = ["client", "bank", "admin", "asesor"];

    if (!rol) {
      return res.status(400).json({
        message: "El rol es obligatorio"
      });
    }

    if (!allowedRoles.includes(rol)) {
      return res.status(400).json({
        message: "Rol no válido. Usa client, bank, admin o asesor"
      });
    }

    const [result] = await pool.query(
      "UPDATE User SET rol = ? WHERE id_user = ?",
      [rol, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      message: "Rol actualizado correctamente",
      id_user: id,
      rol
    });
  } catch (error) {
    console.error("Error al actualizar rol:", error);

    res.status(500).json({
      message: "Error al actualizar rol",
      error: error.message
    });
  }
};

const createBankUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener mínimo 6 caracteres"
      });
    }

    const [existingUsers] = await pool.query(
      "SELECT id_user FROM User WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Ya existe una cuenta con ese correo"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO User (username, password_hash, rol, estado_cuenta) VALUES (?, ?, ?, ?)",
      [username, passwordHash, "bank", true]
    );

    return res.status(201).json({
      message: "Banco creado correctamente",
      user: {
        id_user: result.insertId,
        username,
        rol: "bank",
        estado_cuenta: true
      }
    });
  } catch (error) {
    console.error("Error al crear banco:", error);

    return res.status(500).json({
      message: "Error al crear banco",
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { id_user, currentPassword, newPassword } = req.body;

    if (!id_user || !currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "La nueva contraseña debe tener mínimo 8 caracteres"
      });
    }

    const [users] = await pool.query(
      "SELECT id_user, password_hash FROM User WHERE id_user = ?",
      [id_user]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "La contraseña actual es incorrecta"
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE User SET password_hash = ? WHERE id_user = ?",
      [newPasswordHash, id_user]
    );

    return res.json({
      message: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);

    return res.status(500).json({
      message: "Error al cambiar contraseña",
      error: error.message
    });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [users] = await pool.query(
      "SELECT id_user, username, rol FROM `User` WHERE id_user = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    await pool.query(
      `
      UPDATE \`User\`
      SET estado_cuenta = false,
          suspension_until = DATE_ADD(NOW(), INTERVAL 1 DAY),
          suspension_reason = ?
      WHERE id_user = ?
      `,
      [reason || "Suspensión temporal solicitada por la entidad financiera", id]
    );

    return res.json({
      message: "Cuenta suspendida temporalmente por 24 horas"
    });
  } catch (error) {
    console.error("Error al suspender cuenta:", error);

    return res.status(500).json({
      message: "Error al suspender cuenta",
      error: error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name } = req.body;

    if (!display_name || display_name.trim().length < 2) {
      return res.status(400).json({
        message: "El nombre debe tener al menos 2 caracteres"
      });
    }

    const [result] = await pool.query(
      "UPDATE `User` SET display_name = ? WHERE id_user = ?",
      [display_name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    return res.json({
      message: "Perfil actualizado correctamente",
      user: {
        id_user: Number(id),
        display_name: display_name.trim()
      }
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);

    return res.status(500).json({
      message: "Error al actualizar perfil",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getUsers,
  updateUserRole,
  createBankUser,
  changePassword,
  suspendUser,
  updateProfile
};