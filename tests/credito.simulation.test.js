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
});
