const express = require("express");
const router = express.Router();
const { authenticateToken, optionalAuth, authorizeRoles } = require("../middleware/auth.middleware");
const {
  validateTextParam,
  validateCreateEntity,
  validateUpdateEntity,
  validateProductPayload
} = require("../middleware/validation.middleware");
const {
  listEntities,
  createEntity,
  updateEntity,
  createProduct,
  updateProduct
} = require("../controllers/entities.controller");

router.get("/", optionalAuth, listEntities);
router.post("/", authenticateToken, authorizeRoles("admin"), validateCreateEntity, createEntity);
router.patch("/:id", authenticateToken, authorizeRoles("admin"), validateTextParam("id"), validateUpdateEntity, updateEntity);
router.post("/:entityId/products", authenticateToken, authorizeRoles("admin", "bank"), validateTextParam("entityId"), validateProductPayload, createProduct);
router.patch("/:entityId/products/:productId", authenticateToken, authorizeRoles("admin", "bank"), validateTextParam("entityId"), validateTextParam("productId"), validateProductPayload, updateProduct);

module.exports = router;
