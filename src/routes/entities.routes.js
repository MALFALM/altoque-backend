const express = require("express");
const router = express.Router();
const { authenticateToken, optionalAuth, authorizeRoles } = require("../middleware/auth.middleware");
const {
  listEntities,
  createEntity,
  updateEntity,
  createProduct,
  updateProduct
} = require("../controllers/entities.controller");

router.get("/", optionalAuth, listEntities);
router.post("/", authenticateToken, authorizeRoles("admin"), createEntity);
router.patch("/:id", authenticateToken, authorizeRoles("admin"), updateEntity);
router.post("/:entityId/products", authenticateToken, authorizeRoles("admin", "bank"), createProduct);
router.patch("/:entityId/products/:productId", authenticateToken, authorizeRoles("admin", "bank"), updateProduct);

module.exports = router;
