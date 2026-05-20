/**
 * Auth route integration tests
 * Covers: signup, login, /me, profile update, email change,
 *         forgot-password, reset-password, delete-account
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";

// Dynamically import the app so the DATABASE_PATH env var set in setup.js
// is in place before better-sqlite3 opens the file.
let app;
beforeAll(async () => {
  const mod = await import("../index.js");
  app = mod.default ?? mod.app ?? mod;
});

// ─── helpers ──────────────────────────────────────────────────────────────────
const rand = () => Math.random().toString(36).slice(2, 8);
async function registerUser(overrides = {}) {
  const payload = {
    name:     overrides.name     ?? `Test User ${rand()}`,
    email:    overrides.email    ?? `test-${rand()}@example.com`,
    password: overrides.password ?? "Password123!",
  };
  const res = await request(app).post("/api/auth/signup").send(payload);
  return { res, ...payload };
}

// ─── signup ───────────────────────────────────────────────────────────────────
describe("POST /api/auth/signup", () => {
  it("creates an account and returns a token + user", async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined(); // never leaked
  });

  it("rejects duplicate email", async () => {
    const email = `dup-${rand()}@example.com`;
    await registerUser({ email });
    const { res } = await registerUser({ email });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("rejects short password", async () => {
    const { res } = await registerUser({ password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it("rejects invalid email format", async () => {
    const { res } = await registerUser({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("returns token on valid credentials", async () => {
    const { email, password } = await registerUser().then(r => r);
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    const { email } = await registerUser();
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrongpass!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect password/i);
  });

  it("rejects unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@nowhere.com", password: "anything" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no account/i);
  });
});

// ─── /me ──────────────────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  it("returns user data for a valid token", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBeDefined();
    expect(me.body.password_hash).toBeUndefined();
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a bogus token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer fake.token.here");
    expect(res.status).toBe(401);
  });
});

// ─── profile update ───────────────────────────────────────────────────────────
describe("PUT /api/auth/profile", () => {
  it("updates display name", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("changes password with correct current password", async () => {
    const password = "OldPass123!";
    const { res: signup, email } = await registerUser({ password });
    const token = signup.body.token;

    const update = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Same Name", currentPassword: password, newPassword: "NewPass456!" });
    expect(update.status).toBe(200);

    // Login with new password should work
    const login = await request(app).post("/api/auth/login").send({ email, password: "NewPass456!" });
    expect(login.status).toBe(200);
  });

  it("rejects password change with wrong current password", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", currentPassword: "wrong!", newPassword: "NewPass456!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it("rejects empty name", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   " });
    expect(res.status).toBe(400);
  });
});

// ─── change email ─────────────────────────────────────────────────────────────
describe("PUT /api/auth/email", () => {
  it("changes email with correct password", async () => {
    const password = "TestPass123!";
    const { res: signup } = await registerUser({ password });
    const token = signup.body.token;
    const newEmail = `changed-${rand()}@example.com`;

    const res = await request(app)
      .put("/api/auth/email")
      .set("Authorization", `Bearer ${token}`)
      .send({ newEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(newEmail);
  });

  it("rejects wrong password", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const res = await request(app)
      .put("/api/auth/email")
      .set("Authorization", `Bearer ${token}`)
      .send({ newEmail: `x-${rand()}@example.com`, password: "wrongpass!" });
    expect(res.status).toBe(400);
  });

  it("rejects email already taken by another account", async () => {
    const { res: s1, email: email1 } = await registerUser();
    const { res: s2 } = await registerUser();
    const res = await request(app)
      .put("/api/auth/email")
      .set("Authorization", `Bearer ${s2.body.token}`)
      .send({ newEmail: email1, password: "Password123!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ─── forgot / reset password ──────────────────────────────────────────────────
describe("Forgot/reset password flow", () => {
  it("forgot-password always returns 200 (prevents enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@nowhere.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("reset-password rejects invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "totally-fake-token", password: "NewPass123!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("reset-password rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "fake", password: "short" });
    expect(res.status).toBe(400);
  });
});

// ─── delete account ───────────────────────────────────────────────────────────
describe("DELETE /api/auth/account", () => {
  it("deletes account with correct password", async () => {
    const password = "TestPass123!";
    const { res: signup } = await registerUser({ password });
    const token = signup.body.token;

    const del = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${token}`)
      .send({ password });
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    // /me should now return 401 (account no longer exists)
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(401);
  });

  it("rejects account deletion with wrong password", async () => {
    const { res: signup } = await registerUser();
    const token = signup.body.token;
    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrongpass!" });
    expect(res.status).toBe(400);
  });
});
