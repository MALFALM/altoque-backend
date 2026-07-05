require("dotenv").config({ quiet: process.env.NODE_ENV === "test" });

const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
