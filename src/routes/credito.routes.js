const express = require("express");
const router = express.Router();

router.post("/simular", (req, res) => {
  const {
    precioVehiculo,
    cuotaInicial,
    tasaInteres,
    plazoMeses,
    valorResidual = 0,
    tipoTasa = "EFECTIVA"
  } = req.body;

  if (!precioVehiculo || !cuotaInicial || !tasaInteres || !plazoMeses) {
    return res.status(400).json({
      message: "Faltan datos obligatorios para simular el crédito"
    });
  }

  const montoFinanciado = precioVehiculo - cuotaInicial;

  let tem;

  if (tipoTasa === "EFECTIVA") {
    tem = Math.pow(1 + tasaInteres / 100, 30 / 360) - 1;
  } else {
    tem = tasaInteres / 100 / 12;
  }

  const valorResidualPresente =
    valorResidual / Math.pow(1 + tem, plazoMeses);

  const capitalAmortizable = montoFinanciado - valorResidualPresente;

  const cuotaBase =
    capitalAmortizable *
    ((tem * Math.pow(1 + tem, plazoMeses)) /
      (Math.pow(1 + tem, plazoMeses) - 1));

  res.json({
    message: "Simulación generada correctamente",
    datosEntrada: {
      precioVehiculo,
      cuotaInicial,
      tasaInteres,
      plazoMeses,
      valorResidual,
      tipoTasa
    },
    resultados: {
      montoFinanciado: Number(montoFinanciado.toFixed(2)),
      tem: Number((tem * 100).toFixed(4)),
      cuotaBase: Number(cuotaBase.toFixed(2))
    }
  });
});

module.exports = router;