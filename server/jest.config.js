/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  // No transform — we run native ESM via --experimental-vm-modules
  // (package.json has "type":"module" so Jest already treats .js as ESM)
  transform: {},
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["./test/setup.js"],
  verbose: true,
};
