const pool = require("../config/db");

const createTicket = async (req, res) => {
  try {
    const { id_user, subject, message, sender_role, sender_name } = req.body;

    if (!id_user || !subject || !message) {
      return res.status(400).json({
        message: "Usuario, asunto y mensaje son obligatorios"
      });
    }

    const [ticketResult] = await pool.query(
      `INSERT INTO SupportTicket (id_user, subject, status)
       VALUES (?, ?, 'open')`,
      [id_user, subject]
    );

    const ticketId = ticketResult.insertId;

    await pool.query(
      `INSERT INTO SupportMessage (id_ticket, sender_role, sender_name, message_text)
       VALUES (?, ?, ?, ?)`,
      [
        ticketId,
        sender_role || "client",
        sender_name || "Usuario",
        message
      ]
    );

    return res.status(201).json({
      message: "Ticket creado correctamente",
      ticketId
    });
  } catch (error) {
    console.error("Error al crear ticket:", error);
    return res.status(500).json({
      message: "Error al crear ticket",
      error: error.message
    });
  }
};

const getTickets = async (req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT 
        t.id_ticket,
        t.id_user,
        t.subject,
        t.status,
        t.created_at,
        t.updated_at,
        u.username,
        u.rol,
        u.display_name
      FROM SupportTicket t
      INNER JOIN \`User\` u ON t.id_user = u.id_user
      ORDER BY t.updated_at DESC`
    );

    for (const ticket of tickets) {
      const [messages] = await pool.query(
        `SELECT 
          id_message,
          id_ticket,
          sender_role,
          sender_name,
          message_text,
          created_at
        FROM SupportMessage
        WHERE id_ticket = ?
        ORDER BY created_at ASC`,
        [ticket.id_ticket]
      );

      ticket.messages = messages;
    }

    return res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error("Error al listar tickets:", error);
    return res.status(500).json({
      success: false,
      message: "Error al listar tickets",
      error: error.message
    });
  }
};

const getTicketsByUser = async (req, res) => {
  try {
    const { id_user } = req.params;

    const [tickets] = await pool.query(
      `SELECT 
        id_ticket,
        id_user,
        subject,
        status,
        created_at,
        updated_at
      FROM SupportTicket
      WHERE id_user = ?
      ORDER BY updated_at DESC`,
      [id_user]
    );

    for (const ticket of tickets) {
      const [messages] = await pool.query(
        `SELECT 
          id_message,
          id_ticket,
          sender_role,
          sender_name,
          message_text,
          created_at
        FROM SupportMessage
        WHERE id_ticket = ?
        ORDER BY created_at ASC`,
        [ticket.id_ticket]
      );

      ticket.messages = messages;
    }

    return res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error("Error al listar tickets del usuario:", error);
    return res.status(500).json({
      success: false,
      message: "Error al listar tickets del usuario",
      error: error.message
    });
  }
};

const addMessage = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { sender_role, sender_name, message } = req.body;

    if (!message) {
      return res.status(400).json({
        message: "El mensaje es obligatorio"
      });
    }

    await pool.query(
      `INSERT INTO SupportMessage (id_ticket, sender_role, sender_name, message_text)
       VALUES (?, ?, ?, ?)`,
      [
        id_ticket,
        sender_role || "admin",
        sender_name || "Soporte Altoque",
        message
      ]
    );

    await pool.query(
      `UPDATE SupportTicket
       SET updated_at = NOW()
       WHERE id_ticket = ?`,
      [id_ticket]
    );

    return res.status(201).json({
      message: "Mensaje enviado correctamente"
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    return res.status(500).json({
      message: "Error al enviar mensaje",
      error: error.message
    });
  }
};

const closeTicket = async (req, res) => {
  try {
    const { id_ticket } = req.params;

    const [result] = await pool.query(
      `UPDATE SupportTicket
       SET status = 'closed'
       WHERE id_ticket = ?`,
      [id_ticket]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Ticket no encontrado"
      });
    }

    return res.json({
      message: "Ticket cerrado correctamente"
    });
  } catch (error) {
    console.error("Error al cerrar ticket:", error);
    return res.status(500).json({
      message: "Error al cerrar ticket",
      error: error.message
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketsByUser,
  addMessage,
  closeTicket
};