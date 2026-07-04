const express = require("express");
const router = express.Router();

const {
  createTicket,
  getTickets,
  getTicketsByUser,
  addMessage,
  closeTicket
} = require("../controllers/support.controller");

router.post("/tickets", createTicket);
router.get("/tickets", getTickets);
router.get("/tickets/user/:id_user", getTicketsByUser);
router.post("/tickets/:id_ticket/messages", addMessage);
router.patch("/tickets/:id_ticket/close", closeTicket);

module.exports = router;