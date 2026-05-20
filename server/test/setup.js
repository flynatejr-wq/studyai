import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

// Use a unique temp file per test run so parallel Jest workers don't collide.
// better-sqlite3 supports :memory: but module-level singletons share it across
// tests in the same worker; a named temp file is simpler and equally fast.
const dbFile = join(tmpdir(), `studybuddi-test-${randomBytes(6).toString("hex")}.db`);

process.env.DATABASE_PATH = dbFile;
process.env.JWT_SECRET    = "test-secret-key-minimum-32-characters!!";
process.env.NODE_ENV      = "test";

// Silence console noise from routes under test unless TEST_VERBOSE is set
if (!process.env.TEST_VERBOSE) {
  global.console.error = () => {};
  global.console.warn  = () => {};
  global.console.log   = () => {};
}
