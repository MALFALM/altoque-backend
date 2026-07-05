const request = require("supertest");
const app = require("../src/app");

describe("credit simulation", () => {
  test("generates a valid simulation", async () => {
    const response = await request(app)
      .post("/api/creditos/simular")
      .send({
        vehiclePrice: 50000,
        periods: 24,
        downPaymentPercentage: 20,
        rateType: "TEA",
        rateValue: 14,
        hasVehicularInsurance: false,
        hasDesgravamen: false,
        hasPortes: false
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.summary.loanAmount).toBe(40000);
    expect(response.body.schedule).toHaveLength(24);
  });

  test("rejects excessive periods before running calculations", async () => {
    const response = await request(app)
      .post("/api/creditos/simular")
      .send({
        vehiclePrice: 50000,
        periods: 240,
        rateValue: 14
      })
      .expect(400);

    expect(response.body.message).toBe("periods no puede ser mayor a 120");
  });

  test("matches Interbank Excel French schedule with total grace and desgravamen", async () => {
    const response = await request(app)
      .post("/api/creditos/simular")
      .send({
        vehiclePrice: 3000000,
        periods: 24,
        downPaymentPercentage: 20,
        rateType: "TNA",
        rateValue: 12,
        capitalization: 12,
        hasVehicularInsurance: false,
        hasDesgravamen: true,
        desgravamenRate: 0.05,
        hasPortes: false,
        gracePeriodsTotal: 1,
        gracePeriodsPartial: 0,
        residualValue: 0
      })
      .expect(200);

    expect(response.body.summary.loanAmount).toBe(2400000);
    expect(response.body.summary.monthlyRate).toBe(1);
    expect(response.body.summary.monthlyPayment).toBe(119178.71);
    expect(response.body.summary.tirMonthly).toBe(1.05);
    expect(response.body.summary.tcea).toBe(13.3537);
    expect(response.body.summary.van).toBe(-76827.66);
    expect(response.body.summary.totalInterest).toBe(300809.77);
    expect(response.body.summary.totalDesgravamen).toBe(16300.49);

    expect(response.body.schedule[0]).toMatchObject({
      month: 1,
      type: "Gracia Total",
      totalQuota: 0,
      finalBalance: 2424000
    });
    expect(response.body.schedule[1]).toMatchObject({
      month: 2,
      type: "Cuota Normal",
      totalQuota: 119178.71,
      amortization: 93726.71,
      finalBalance: 2330273.29
    });
  });
});
