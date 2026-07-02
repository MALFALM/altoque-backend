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
      [username, passwordHash, "asesor", true]
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
      "SELECT * FROM User WHERE username = ? AND estado_cuenta = true",
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const user = users[0];

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
        rol: user.rol
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
      "SELECT id_user, username, rol, estado_cuenta FROM User"
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

module.exports = {
  register,
  login,
  getUsers
};