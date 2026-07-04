const express = require("express");
const router = express.Router();
const pool = require("../config/db");


function redondear(valor, decimales = 2) {
  return Number(Number(valor || 0).toFixed(decimales));
}

function nominalToEffective(nominalRate, capitalizationPeriods) {
  return Math.pow(1 + nominalRate / capitalizationPeriods, capitalizationPeriods) - 1;
}

function effectiveAnnualToPeriod(tea, periodsInYear = 12) {
  return Math.pow(1 + tea, 1 / periodsInYear) - 1;
}

function calculateFrenchQuota(principal, monthlyRate, periods, residualValue = 0) {
  if (periods <= 0) {
    throw new Error("El número de periodos debe ser mayor a 0.");
  }

  if (monthlyRate === 0) {
    return (principal - residualValue) / periods;
  }

  const presentValueResidual = residualValue / Math.pow(1 + monthlyRate, periods);
  const presentValueToAmortize = principal - presentValueResidual;

  return (
    presentValueToAmortize *
    ((monthlyRate * Math.pow(1 + monthlyRate, periods)) /
      (Math.pow(1 + monthlyRate, periods) - 1))
  );
}

function calculateNPV(initialInvestment, cashFlows, discountRate) {
  let npv = -initialInvestment;

  for (let index = 0; index < cashFlows.length; index++) {
    npv += cashFlows[index] / Math.pow(1 + discountRate, index + 1);
  }

  return npv;
}

function calculateIRR(initialInvestment, cashFlows) {
  const maxIterations = 1000;
  const precision = 1e-7;
  let rate = 0.1;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = -initialInvestment;
    let derivativeNpv = 0;

    for (let index = 0; index < cashFlows.length; index++) {
      const time = index + 1;
      const factor = Math.pow(1 + rate, time);

      npv += cashFlows[index] / factor;
      derivativeNpv -= (time * cashFlows[index]) / (factor * (1 + rate));
    }

    if (derivativeNpv === 0) {
      break;
    }

    const newRate = rate - npv / derivativeNpv;

    if (!Number.isFinite(newRate)) {
      break;
    }

    if (Math.abs(newRate - rate) < precision) {
      return newRate;
    }

    rate = newRate;
  }

  return rate;
}

function calculateTCEA(monthlyIRR) {
  return Math.pow(1 + monthlyIRR, 12) - 1;
}

function generateSchedule({
  loanAmount,
  monthlyRate,
  periods,
  monthlyInsuranceFixed = 0,
  desgravamenRate = 0,
  residualValue = 0,
  gracePeriodsTotal = 0,
  gracePeriodsPartial = 0
}) {
  const schedule = [];
  let balance = loanAmount;

  const totalGracePeriods = gracePeriodsTotal + gracePeriodsPartial;
  const normalPeriods = periods - totalGracePeriods;

  if (normalPeriods <= 0) {
    throw new Error("El plazo debe ser mayor a la suma de los periodos de gracia.");
  }

  for (let month = 1; month <= periods; month++) {
    const initialBalance = balance;
    const interest = initialBalance * monthlyRate;
    const desgravamenAmount = initialBalance * desgravamenRate;

    let amortization = 0;
    let quota = 0;
    let residualPayment = 0;
    let type = "Cuota Normal";

    if (month <= gracePeriodsTotal) {
      type = "Gracia Total";
      quota = 0;
      amortization = -interest;
    } else if (month <= totalGracePeriods) {
      type = "Gracia Parcial";
      quota = interest;
      amortization = 0;
    } else {
      const remainingPeriods = periods - month + 1;
      quota = calculateFrenchQuota(initialBalance, monthlyRate, remainingPeriods, residualValue);

      if (month === periods) {
        residualPayment = residualValue;
        amortization = initialBalance;
        quota = interest + amortization;
      } else {
        amortization = quota - interest;
      }
    }

    const insurance = monthlyInsuranceFixed + desgravamenAmount;
    const totalQuota = quota + insurance;
    const finalBalance = initialBalance - amortization;

    schedule.push({
      month,
      type,
      initialBalance: redondear(initialBalance),
      interest: redondear(interest),
      amortization: redondear(amortization),
      desgravamen: redondear(desgravamenAmount),
      fixedCharges: redondear(monthlyInsuranceFixed),
      insurance: redondear(insurance),
      quota: redondear(quota),
      residualPayment: redondear(residualPayment),
      totalQuota: redondear(totalQuota),
      finalBalance: redondear(Math.abs(finalBalance) < 0.01 ? 0 : finalBalance)
    });

    balance = finalBalance;
  }

  return schedule;
}


router.post("/simular", (req, res) => {
  try {
    const body = req.body;

    const vehiclePrice = Number(body.vehiclePrice ?? body.precioVehiculo);
    const currency = body.currency ?? body.moneda ?? "PEN";
    const periods = Number(body.periods ?? body.plazoMeses);

    const downPaymentPercentage = Number(
      body.downPaymentPercentage ??
        (body.precioVehiculo ? (Number(body.cuotaInicial) / Number(body.precioVehiculo)) * 100 : 20)
    );

    const rateType = String(body.rateType ?? body.tipoTasa ?? "TEA").toUpperCase();
    const rateValue = Number(body.rateValue ?? body.tasaInteres);
    const capitalization = Number(body.capitalization ?? body.capitalizacion ?? 12);

    const hasVehicularInsurance = body.hasVehicularInsurance ?? true;
    const vehicularInsurancePercentage = Number(body.vehicularInsurancePercentage ?? 0);
    const hasDesgravamen = body.hasDesgravamen ?? true;
    const desgravamenRate = Number(body.desgravamenRate ?? body.tasaDesgravamen ?? 0);
    const hasPortes = body.hasPortes ?? true;
    const portesValue = Number(body.portesValue ?? body.portes ?? 0);

    const gracePeriodsTotal = Number(body.gracePeriodsTotal ?? body.plazoGraciaTotal ?? 0);
    const gracePeriodsPartial = Number(body.gracePeriodsPartial ?? body.plazoGraciaParcial ?? 0);
    const residualValue = Number(body.residualValue ?? body.valorResidual ?? 0);

    if (!vehiclePrice || !periods || !rateValue) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios: vehiclePrice/precioVehiculo, periods/plazoMeses y rateValue/tasaInteres."
      });
    }

    if (vehiclePrice <= 0 || periods <= 0 || rateValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio del vehículo, el plazo y la tasa deben ser mayores a 0."
      });
    }

    const downPayment = vehiclePrice * (downPaymentPercentage / 100);
    const loanAmount = vehiclePrice - downPayment;

    let annualEffectiveRate = rateValue / 100;

    if (rateType === "TNA" || rateType === "NOMINAL") {
      annualEffectiveRate = nominalToEffective(annualEffectiveRate, capitalization);
    }

    const monthlyRate = effectiveAnnualToPeriod(annualEffectiveRate, 12);

    const monthlyVehicularInsurance = hasVehicularInsurance
      ? vehiclePrice * (vehicularInsurancePercentage / 100)
      : 0;

    const monthlyPortes = hasPortes ? portesValue : 0;
    const monthlyInsuranceFixed = monthlyVehicularInsurance + monthlyPortes;

    const schedule = generateSchedule({
      loanAmount,
      monthlyRate,
      periods,
      monthlyInsuranceFixed,
      desgravamenRate: hasDesgravamen ? desgravamenRate / 100 : 0,
      residualValue,
      gracePeriodsTotal,
      gracePeriodsPartial
    });

    const cashFlows = schedule.map((row) => row.totalQuota);
    const discountRate = effectiveAnnualToPeriod(0.1, 12);

    const van = calculateNPV(loanAmount, cashFlows, discountRate);
    const monthlyIRR = calculateIRR(loanAmount, cashFlows);
    const tcea = calculateTCEA(monthlyIRR);

    const normalQuota = schedule.find((row) => row.type === "Cuota Normal");

    const totalPaid = cashFlows.reduce((sum, value) => sum + value, 0);
    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    const totalDesgravamen = schedule.reduce((sum, row) => sum + row.desgravamen, 0);
    const totalFixedCharges = schedule.reduce((sum, row) => sum + row.fixedCharges, 0);

    return res.json({
      success: true,
      message: "Simulación generada correctamente",
      input: {
        vehiclePrice: redondear(vehiclePrice),
        currency,
        downPaymentPercentage: redondear(downPaymentPercentage, 4),
        downPayment: redondear(downPayment),
        periods,
        rateType,
        rateValue: redondear(rateValue, 4),
        capitalization,
        gracePeriodsTotal,
        gracePeriodsPartial,
        residualValue: redondear(residualValue)
      },
      summary: {
        loanAmount: redondear(loanAmount),
        monthlyRate: redondear(monthlyRate * 100, 4),
        monthlyPayment: normalQuota ? normalQuota.totalQuota : schedule[0].totalQuota,
        van: redondear(van),
        tirMonthly: redondear(monthlyIRR * 100, 4),
        tirAnnual: redondear((Math.pow(1 + monthlyIRR, 12) - 1) * 100, 4),
        tcea: redondear(tcea * 100, 4),
        totalPaid: redondear(totalPaid),
        totalInterest: redondear(totalInterest),
        totalDesgravamen: redondear(totalDesgravamen),
        totalFixedCharges: redondear(totalFixedCharges)
      },
      schedule
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/guardar", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      userId,
      cliente,
      vehiculo,
      credito,
      summary,
      schedule
    } = req.body;

    if (!userId || !cliente || !vehiculo || !credito || !summary || !schedule) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios para guardar la simulación"
      });
    }

    await connection.beginTransaction();

    // insertando clientes
    const [clienteResult] = await connection.query(
      `INSERT INTO Cliente 
      (id_user, tipo_documento, numero_documento, nombres, apellidos, telefono, ingreso_mensual, correo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cliente.tipoDocumento || "DNI",
        cliente.numeroDocumento,
        cliente.nombres,
        cliente.apellidos,
        cliente.telefono || null,
        cliente.ingresoMensual || null,
        cliente.correo || null
      ]
    );

    const idCliente = clienteResult.insertId;

    // insertando vehiculo
    const [vehiculoResult] = await connection.query(
      `INSERT INTO Vehiculo
      (marca, modelo, year_fabricacion, precio_venta, tipo_moneda)
      VALUES (?, ?, ?, ?, ?)`,
      [
        vehiculo.marca,
        vehiculo.modelo,
        vehiculo.yearFabricacion,
        vehiculo.precioVenta,
        vehiculo.tipoMoneda || credito.currency || "PEN"
      ]
    );

    const idVehiculo = vehiculoResult.insertId;

    // calculando cuota inicial como monto
    const cuotaInicial =
      Number(credito.vehiclePrice) * (Number(credito.downPaymentPercentage) / 100);

    const metodoPago =
      Number(credito.residualValue || 0) > 0
        ? "Compra Inteligente"
        : "Frances Ordinario";

    // insertando Credito
    const [creditoResult] = await connection.query(
      `INSERT INTO Credito
      (
        id_cliente,
        id_user,
        id_vehiculo,
        tipo_moneda,
        cuota_inicial,
        metodo_pago,
        tipo_tasa,
        capitalizacion,
        tasa_valor,
        tipo_cambio_aplicado,
        plazo_meses,
        plazo_gracia_total,
        plazo_gracia_parcial,
        cuota_final_inteligente,
        VAN,
        TIR,
        TCEA,
        tasa_desgravamen,
        seguro_vehicular,
        portes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idCliente,
        userId,
        idVehiculo,
        credito.currency || "PEN",
        cuotaInicial,
        metodoPago,
        credito.rateType || "TEA",
        String(credito.capitalization || "N/A"),
        credito.rateValue,
        "N/A",
        credito.periods,
        credito.gracePeriodsTotal || 0,
        credito.gracePeriodsPartial || 0,
        credito.residualValue || 0,
        summary.van,
        summary.tirAnnual || summary.tirMonthly || 0,
        summary.tcea,
        credito.desgravamenRate || 0,
        credito.vehicularInsurancePercentage || 0,
        credito.portesValue || 0
      ]
    );

    const idCredito = creditoResult.insertId;

    // insertando CronogramaPago
    const fechaInicio = credito.fechaInicio
      ? new Date(credito.fechaInicio)
      : new Date();

    for (const item of schedule) {
      const fechaVencimiento = new Date(fechaInicio);
      fechaVencimiento.setMonth(fechaInicio.getMonth() + item.month);

      await connection.query(
        `INSERT INTO CronogramaPago
        (
          id_credito,
          numero_mes,
          fecha_vencimiento,
          cuota_mensual,
          monto_desgravamen,
          saldo_inicial_mes,
          interes_mes,
          amortizacion,
          saldo_final_mes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idCredito,
          item.month,
          fechaVencimiento,
          item.totalQuota,
          item.desgravamen || 0,
          item.initialBalance,
          item.interest,
          item.amortization,
          item.finalBalance
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Simulación guardada correctamente",
      data: {
        idCliente,
        idVehiculo,
        idCredito
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error al guardar la simulación",
      error: error.message
    });
  } finally {
    connection.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id_credito,
        c.fecha_solicitud,
        c.tipo_moneda,
        c.cuota_inicial,
        c.metodo_pago,
        c.tipo_tasa,
        c.tasa_valor,
        c.plazo_meses,
        c.VAN,
        c.TIR,
        c.TCEA,
        cl.numero_documento,
        cl.nombres,
        cl.apellidos,
        v.marca,
        v.modelo,
        v.precio_venta
      FROM Credito c
      INNER JOIN Cliente cl ON c.id_cliente = cl.id_cliente
      INNER JOIN Vehiculo v ON c.id_vehiculo = v.id_vehiculo
      ORDER BY c.id_credito DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al listar créditos",
      error: error.message
    });
  }
});

router.get("/:id/cronograma", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        id_cronograma_pago,
        id_credito,
        numero_mes,
        fecha_vencimiento,
        cuota_mensual,
        monto_desgravamen,
        saldo_inicial_mes,
        interes_mes,
        amortizacion,
        saldo_final_mes
      FROM CronogramaPago
      WHERE id_credito = ?
      ORDER BY numero_mes ASC
      `,
      [id]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener cronograma",
      error: error.message
    });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        c.id_credito,
        c.id_user,
        c.fecha_solicitud,
        c.tipo_moneda,
        c.cuota_inicial,
        c.metodo_pago,
        c.tipo_tasa,
        c.tasa_valor,
        c.plazo_meses,
        c.VAN,
        c.TIR,
        c.TCEA,
        c.cuota_final_inteligente,
        c.tasa_desgravamen,
        c.seguro_vehicular,
        c.portes,

        cl.id_cliente,
        cl.nombres,
        cl.apellidos,
        cl.correo,

        v.id_vehiculo,
        v.marca,
        v.modelo,
        v.year_fabricacion,
        v.precio_venta,
        v.tipo_moneda AS moneda_vehiculo
      FROM Credito c
      INNER JOIN Cliente cl ON c.id_cliente = cl.id_cliente
      INNER JOIN Vehiculo v ON c.id_vehiculo = v.id_vehiculo
      WHERE c.id_user = ?
      ORDER BY c.id_credito DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener simulaciones del usuario",
      error: error.message
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        c.*,
        cl.tipo_documento,
        cl.numero_documento,
        cl.nombres,
        cl.apellidos,
        cl.telefono,
        cl.ingreso_mensual,
        cl.correo,
        v.marca,
        v.modelo,
        v.year_fabricacion,
        v.precio_venta
      FROM Credito c
      INNER JOIN Cliente cl ON c.id_cliente = cl.id_cliente
      INNER JOIN Vehiculo v ON c.id_vehiculo = v.id_vehiculo
      WHERE c.id_credito = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Crédito no encontrado"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener crédito",
      error: error.message
    });
  }
});

module.exports = router;