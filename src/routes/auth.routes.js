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
router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);
router.post("/banks", createBankUser);
router.patch("/change-password", changePassword);
router.patch("/users/:id/suspend", suspendUser);
router.patch("/users/:id/profile", updateProfile);

module.exports = router;
