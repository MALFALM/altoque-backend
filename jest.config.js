module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"]
};
