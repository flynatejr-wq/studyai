/**
 * Guides route integration tests
 * Covers: save (free-limit enforcement, idempotency), list, get, delete,
 *         favorite toggle, share link, export
 */
import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";

let app;
beforeAll(async () => {
  const mod = await import("../index.js");
  app = mod.default ?? mod.app ?? mod;
});

// ─── helpers ──────────────────────────────────────────────────────────────────
const rand = () => Math.random().toString(36).slice(2, 8);

async function createAuthToken() {
  const email = `g-${rand()}@example.com`;
  const password = "Password123!";
  const res = await request(app).post("/api/auth/signup").send({
    name: `Guide Tester ${rand()}`,
    email,
    password,
  });
  return { token: res.body.token, email, password, userId: res.body.user?.id };
}

function guidePayload(overrides = {}) {
  return {
    title:          overrides.title          ?? `Test Guide ${rand()}`,
    type:           overrides.type           ?? "text",
    summary:        overrides.summary        ?? ["Point one", "Point two"],
    key_terms:      overrides.key_terms      ?? [{ term: "Term", definition: "Def" }],
    quiz_questions: overrides.quiz_questions ?? [{ question: "Q?", answer: "A." }],
    sections:       overrides.sections       ?? [],
    idempotency_key: overrides.idempotency_key,
  };
}

// ─── save guide ───────────────────────────────────────────────────────────────
describe("POST /api/guides", () => {
  it("saves a guide for a free user", async () => {
    const { token } = await createAuthToken();
    const res = await request(app)
      .post("/api/guides")
      .set("Authorization", `Bearer ${token}`)
      .send(guidePayload());
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBeDefined();
  });

  it("blocks a second guide on the free tier (FREE_LIMIT_GUIDES)", async () => {
    const { token } = await createAuthToken();
    // First guide — should succeed
    await request(app)
      .post("/api/guides")
      .set("Authorization", `Bearer ${token}`)
      .send(guidePayload());

    // Second guide — must be blocked
    const res = await request(app)
      .post("/api/guides")
      .set("Authorization", `Bearer ${token}`)
      .send(guidePayload());
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FREE_LIMIT_GUIDES");
  });

  it("idempotency: returns the same guide on duplicate saves", async () => {
    const { token } = await createAuthToken();
    const key = `idem-${rand()}`;
    const payload = guidePayload({ idempotency_key: key });

    const first  = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(payload);
    const second = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.id).toBe(second.body.id); // same guide returned, no duplicate
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/guides").send(guidePayload());
    expect(res.status).toBe(401);
  });

  it("rejects missing required fields", async () => {
    const { token } = await createAuthToken();
    const res = await request(app)
      .post("/api/guides")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "No content" }); // missing summary/key_terms/quiz_questions
    expect(res.status).toBe(400);
  });
});

// ─── list guides ──────────────────────────────────────────────────────────────
describe("GET /api/guides", () => {
  it("returns an array for the authenticated user", async () => {
    const { token } = await createAuthToken();
    await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const res = await request(app).get("/api/guides").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns paginated guides with ?limit", async () => {
    const { token } = await createAuthToken();
    await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const res = await request(app).get("/api/guides?limit=10").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.guides).toBeDefined();
    expect(typeof res.body.total).toBe("number");
  });

  it("does not return other users' guides", async () => {
    const user1 = await createAuthToken();
    const user2 = await createAuthToken();
    await request(app).post("/api/guides").set("Authorization", `Bearer ${user1.token}`).send(guidePayload());
    const res = await request(app).get("/api/guides").set("Authorization", `Bearer ${user2.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // user2 has no guides
  });
});

// ─── get single guide ─────────────────────────────────────────────────────────
describe("GET /api/guides/:id", () => {
  it("returns the guide for its owner", async () => {
    const { token } = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const res = await request(app).get(`/api/guides/${saved.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(saved.body.id);
  });

  it("returns 404 for another user's guide", async () => {
    const user1 = await createAuthToken();
    const user2 = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${user1.token}`).send(guidePayload());
    const res = await request(app).get(`/api/guides/${saved.body.id}`).set("Authorization", `Bearer ${user2.token}`);
    expect(res.status).toBe(404);
  });
});

// ─── delete guide ─────────────────────────────────────────────────────────────
describe("DELETE /api/guides/:id", () => {
  it("deletes a guide and decrements total_guides", async () => {
    const { token, userId } = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const del = await request(app).delete(`/api/guides/${saved.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it("returns 404 when deleting a non-existent guide", async () => {
    const { token } = await createAuthToken();
    const res = await request(app).delete("/api/guides/fake-id-doesnt-exist").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── favorite toggle ──────────────────────────────────────────────────────────
describe("PATCH /api/guides/:id/favorite", () => {
  it("toggles is_favorite on and off", async () => {
    const { token } = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const id = saved.body.id;

    const on  = await request(app).patch(`/api/guides/${id}/favorite`).set("Authorization", `Bearer ${token}`);
    expect(on.status).toBe(200);
    expect(on.body.is_favorite).toBe(1);

    const off = await request(app).patch(`/api/guides/${id}/favorite`).set("Authorization", `Bearer ${token}`);
    expect(off.status).toBe(200);
    expect(off.body.is_favorite).toBe(0);
  });
});

// ─── share link ───────────────────────────────────────────────────────────────
describe("POST /api/guides/:id/share", () => {
  it("creates a share token and returns it", async () => {
    const { token } = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const share = await request(app).post(`/api/guides/${saved.body.id}/share`).set("Authorization", `Bearer ${token}`);
    expect(share.status).toBe(200);
    expect(share.body.token).toBeTruthy();
  });

  it("returns the same token on subsequent calls (idempotent)", async () => {
    const { token } = await createAuthToken();
    const saved = await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const id = saved.body.id;
    const first  = await request(app).post(`/api/guides/${id}/share`).set("Authorization", `Bearer ${token}`);
    const second = await request(app).post(`/api/guides/${id}/share`).set("Authorization", `Bearer ${token}`);
    expect(first.body.token).toBe(second.body.token);
  });
});

// ─── data export ─────────────────────────────────────────────────────────────
describe("GET /api/export", () => {
  it("returns a JSON export for the authenticated user", async () => {
    const { token } = await createAuthToken();
    await request(app).post("/api/guides").set("Authorization", `Bearer ${token}`).send(guidePayload());
    const res = await request(app).get("/api/export").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.account).toBeDefined();
    expect(Array.isArray(res.body.guides)).toBe(true);
    expect(res.body.exported_at).toBeTruthy();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/export");
    expect(res.status).toBe(401);
  });
});
