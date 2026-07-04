const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth.middleware");

const {
  register,
  login,
  bootstrapAdmin,
  getUsers,
  updateUserRole,
  createBankUser
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/bootstrap-admin", bootstrapAdmin);
router.get("/users", authenticateToken, authorizeRoles("admin"), getUsers);
router.patch("/users/:id/role", authenticateToken, authorizeRoles("admin"), updateUserRole);
router.post("/banks", authenticateToken, authorizeRoles("admin"), createBankUser);

module.exports = router;
