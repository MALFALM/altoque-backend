const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth.middleware");
const {
  validateNumericParam,
  validateRegister,
  validateLogin,
  validateBootstrapAdmin,
  validateRoleUpdate,
  validateBankUser,
  validateChangePassword,
  validateSuspendUser
} = require("../middleware/validation.middleware");

const {
  register,
  login,
  bootstrapAdmin,
  getUsers,
  updateUserRole,
  createBankUser,
  changePassword,
  suspendUser,
  updateProfile
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/users", authenticateToken, authorizeRoles("admin"), getUsers);
router.patch("/users/:id/role", authenticateToken, authorizeRoles("admin"), validateNumericParam("id"), validateRoleUpdate, updateUserRole);
router.post("/banks", authenticateToken, authorizeRoles("admin"), validateBankUser, createBankUser);
router.patch("/change-password", authenticateToken, validateChangePassword, changePassword);
router.patch("/users/:id/suspend", authenticateToken, authorizeRoles("admin"), validateNumericParam("id"), validateSuspendUser, suspendUser);
router.patch("/users/:id/profile", authenticateToken, validateNumericParam("id"), updateProfile);

module.exports = router;
