const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../src/app");

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

describe("security middleware", () => {
  test("health endpoint keeps the public contract and security headers", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({
      success: true,
      service: "altoque-backend"
    });
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("allows configured frontend origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  test("rejects untrusted origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://evil.test")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Origen no permitido por CORS"
    });
  });

  test("protects admin-only auth routes", async () => {
    const response = await request(app).get("/api/auth/users").expect(401);

    expect(response.body.message).toBe("Token de autenticacion requerido");
  });

  test("prevents clients from reading another user's credits", async () => {
    const clientToken = token({
      id_user: 1,
      username: "client@example.com",
      rol: "client"
    });

    const response = await request(app)
      .get("/api/creditos/user/2")
      .set("Authorization", `Bearer ${clientToken}`)
      .expect(403);

    expect(response.body.message).toBe("No tienes permisos para esta accion");
  });
});
