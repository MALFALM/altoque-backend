const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getUsers,
  updateUserRole,
  createBankUser
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);
router.post("/banks", createBankUser);

module.exports = router;