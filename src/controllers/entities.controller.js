const pool = require("../config/db");

function bool(value) {
  return Boolean(Number(value));
}

function normalizeEntityId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function canManageEntity(req, entityId) {
  return req.user?.rol === "admin" || (req.user?.rol === "bank" && req.user?.bankId === entityId);
}

function mapProduct(row) {
  return {
    id: row.id_producto,
    name: row.nombre,
    rateType: row.tipo_tasa,
    rateValue: Number(row.tasa_valor),
    capitalization: Number(row.capitalizacion || 12),
    hasDesgravamen: bool(row.has_desgravamen),
    desgravamenRate: Number(row.tasa_desgravamen || 0),
    hasVehicularInsurance: bool(row.has_seguro_vehicular),
    vehicularInsurancePercentage: Number(row.seguro_vehicular_pct || 0),
    hasPortes: bool(row.has_portes),
    portesValue: Number(row.portes_valor || 0),
    active: bool(row.activo),
    promotions: []
  };
}

async function fetchEntities({ includeSuspended = false, entityId = null } = {}) {
  const entityParams = [];
  const entityWhere = [];

  if (!includeSuspended) {
    entityWhere.push("estado = 'active'");
  }

  if (entityId) {
    entityWhere.push("id_entidad_financiera = ?");
    entityParams.push(entityId);
  }

  const [entities] = await pool.query(
    `SELECT id_entidad_financiera, nombre, theme_color, estado, created_at
     FROM EntidadFinanciera
     ${entityWhere.length ? `WHERE ${entityWhere.join(" AND ")}` : ""}
     ORDER BY nombre ASC`,
    entityParams
  );

  if (entities.length === 0) return [];

  const ids = entities.map((entity) => entity.id_entidad_financiera);
  const placeholders = ids.map(() => "?").join(",");

  const [products] = await pool.query(
    `SELECT * FROM ProductoFinanciero
     WHERE id_entidad_financiera IN (${placeholders})
     ORDER BY nombre ASC`,
    ids
  );

  const productIds = products.map((product) => product.id_producto);
  let promotions = [];

  if (productIds.length > 0) {
    const promoPlaceholders = productIds.map(() => "?").join(",");
    const [promoRows] = await pool.query(
      `SELECT * FROM Promocion
       WHERE id_producto IN (${promoPlaceholders})
       ORDER BY nombre ASC`,
      productIds
    );
    promotions = promoRows;
  }

  const entityMap = new Map();
  for (const entity of entities) {
    entityMap.set(entity.id_entidad_financiera, {
      id: entity.id_entidad_financiera,
      name: entity.nombre,
      themeColor: entity.theme_color,
      isSuspended: entity.estado !== "active",
      products: []
    });
  }

  const productMap = new Map();
  for (const product of products) {
    const mapped = mapProduct(product);
    productMap.set(product.id_producto, mapped);
    const entity = entityMap.get(product.id_entidad_financiera);
    if (entity) entity.products.push(mapped);
  }

  for (const promo of promotions) {
    const product = productMap.get(promo.id_producto);
    if (!product) continue;

    product.promotions.push({
      id: promo.id_promocion,
      name: promo.nombre,
      type: promo.tipo,
      value: Number(promo.valor || 0),
      active: bool(promo.activa),
      productId: promo.id_producto
    });
  }

  return Array.from(entityMap.values());
}

function productPayload(body, entityId, existingId = null) {
  const id = existingId || normalizeEntityId(body.id || `producto-${Date.now()}`);

  return {
    id,
    entityId,
    name: String(body.name || "Nuevo Producto").trim(),
    rateType: String(body.rateType || "TEA").toUpperCase(),
    rateValue: Number(body.rateValue ?? 0),
    capitalization: Number(body.capitalization || 12),
    hasDesgravamen: Boolean(body.hasDesgravamen),
    desgravamenRate: Number(body.desgravamenRate || 0),
    hasVehicularInsurance: Boolean(body.hasVehicularInsurance),
    vehicularInsurancePercentage: Number(body.vehicularInsurancePercentage || 0),
    hasPortes: Boolean(body.hasPortes),
    portesValue: Number(body.portesValue || 0),
    active: body.active === undefined ? true : Boolean(body.active),
    promotions: Array.isArray(body.promotions) ? body.promotions : []
  };
}

async function upsertPromotions(connection, productId, promotions) {
  await connection.query("DELETE FROM Promocion WHERE id_producto = ?", [productId]);

  for (const promo of promotions) {
    const promoId = String(promo.id || `promo-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await connection.query(
      `INSERT INTO Promocion (id_promocion, id_producto, nombre, tipo, valor, activa)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        promoId,
        productId,
        String(promo.name || "Promocion"),
        String(promo.type || "rate_discount"),
        Number(promo.value || 0),
        promo.active === undefined ? true : Boolean(promo.active)
      ]
    );
  }
}

const listEntities = async (req, res) => {
  try {
    const includeSuspended = req.user?.rol === "admin";
    const entities = await fetchEntities({ includeSuspended });
    return res.json({ success: true, data: entities });
  } catch (error) {
    console.error("Error al listar entidades:", error);
    return res.status(500).json({ success: false, message: "Error al listar entidades" });
  }
};

const createEntity = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const id = normalizeEntityId(req.body.id);
    const name = String(req.body.name || "").trim();
    const themeColor = req.body.themeColor || "#0f172a";
    const bankUser = req.body.bankUser || null;

    if (!id || !name) {
      return res.status(400).json({ success: false, message: "id y name son obligatorios" });
    }

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO EntidadFinanciera (id_entidad_financiera, nombre, theme_color, estado)
       VALUES (?, ?, ?, 'active')`,
      [id, name, themeColor]
    );

    if (bankUser?.username && bankUser?.password) {
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(bankUser.password, 10);
      await connection.query(
        "INSERT INTO User (username, password_hash, rol, estado_cuenta, id_entidad_financiera) VALUES (?, ?, 'bank', true, ?)",
        [String(bankUser.username).trim().toLowerCase(), passwordHash, id]
      );
    }

    await connection.commit();

    const [created] = await fetchEntities({ includeSuspended: true, entityId: id });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    await connection.rollback();
    console.error("Error al crear entidad:", error);
    return res.status(500).json({ success: false, message: "Error al crear entidad" });
  } finally {
    connection.release();
  }
};

const updateEntity = async (req, res) => {
  try {
    const id = normalizeEntityId(req.params.id);
    const fields = [];
    const values = [];

    if (req.body.name !== undefined) {
      fields.push("nombre = ?");
      values.push(String(req.body.name).trim());
    }

    if (req.body.themeColor !== undefined) {
      fields.push("theme_color = ?");
      values.push(req.body.themeColor);
    }

    if (req.body.isSuspended !== undefined) {
      fields.push("estado = ?");
      values.push(req.body.isSuspended ? "suspended" : "active");
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No hay campos para actualizar" });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE EntidadFinanciera SET ${fields.join(", ")} WHERE id_entidad_financiera = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Entidad no encontrada" });
    }

    const [updated] = await fetchEntities({ includeSuspended: true, entityId: id });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error al actualizar entidad:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar entidad" });
  }
};

const createProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const entityId = normalizeEntityId(req.params.entityId);

    if (!canManageEntity(req, entityId)) {
      return res.status(403).json({ success: false, message: "No puedes editar esta entidad" });
    }

    const product = productPayload(req.body, entityId);
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO ProductoFinanciero
       (id_producto, id_entidad_financiera, nombre, tipo_tasa, tasa_valor, capitalizacion,
        has_desgravamen, tasa_desgravamen, has_seguro_vehicular, seguro_vehicular_pct,
        has_portes, portes_valor, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.entityId,
        product.name,
        product.rateType,
        product.rateValue,
        product.capitalization,
        product.hasDesgravamen,
        product.desgravamenRate,
        product.hasVehicularInsurance,
        product.vehicularInsurancePercentage,
        product.hasPortes,
        product.portesValue,
        product.active
      ]
    );

    await upsertPromotions(connection, product.id, product.promotions);
    await connection.commit();

    const [entity] = await fetchEntities({ includeSuspended: true, entityId });
    return res.status(201).json({ success: true, data: entity });
  } catch (error) {
    await connection.rollback();
    console.error("Error al crear producto:", error);
    return res.status(500).json({ success: false, message: "Error al crear producto" });
  } finally {
    connection.release();
  }
};

const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const entityId = normalizeEntityId(req.params.entityId);
    const productId = String(req.params.productId || "");

    if (!canManageEntity(req, entityId)) {
      return res.status(403).json({ success: false, message: "No puedes editar esta entidad" });
    }

    const product = productPayload(req.body, entityId, productId);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE ProductoFinanciero
       SET nombre = ?, tipo_tasa = ?, tasa_valor = ?, capitalizacion = ?,
           has_desgravamen = ?, tasa_desgravamen = ?, has_seguro_vehicular = ?, seguro_vehicular_pct = ?,
           has_portes = ?, portes_valor = ?, activo = ?
       WHERE id_producto = ? AND id_entidad_financiera = ?`,
      [
        product.name,
        product.rateType,
        product.rateValue,
        product.capitalization,
        product.hasDesgravamen,
        product.desgravamenRate,
        product.hasVehicularInsurance,
        product.vehicularInsurancePercentage,
        product.hasPortes,
        product.portesValue,
        product.active,
        productId,
        entityId
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    await upsertPromotions(connection, productId, product.promotions);
    await connection.commit();

    const [entity] = await fetchEntities({ includeSuspended: true, entityId });
    return res.json({ success: true, data: entity });
  } catch (error) {
    await connection.rollback();
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar producto" });
  } finally {
    connection.release();
  }
};

module.exports = {
  listEntities,
  createEntity,
  updateEntity,
  createProduct,
  updateProduct
};
