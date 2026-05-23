# Classroom Feature — Integration Guide

All code is complete and isolated. Nothing in this folder touches the live app.
Follow these steps when ready to ship.

---

## 1. Database — add tables (server/db.js)

Append this block inside db.js, after the existing `safeAlter` calls:

```js
// ── Classroom feature ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id           TEXT PRIMARY KEY,
    teacher_id   TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    join_code    TEXT NOT NULL UNIQUE,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS class_members (
    id          TEXT PRIMARY KEY,
    class_id    TEXT NOT NULL,
    student_id  TEXT NOT NULL,
    joined_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(class_id, student_id),
    FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS class_guides (
    id         TEXT PRIMARY KEY,
    class_id   TEXT NOT NULL,
    guide_id   TEXT NOT NULL,
    shared_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(class_id, guide_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (guide_id) REFERENCES guides(id)  ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_classes_teacher       ON classes(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_classes_join_code     ON classes(join_code);
  CREATE INDEX IF NOT EXISTS idx_class_members_class   ON class_members(class_id);
  CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);
  CREATE INDEX IF NOT EXISTS idx_class_guides_class    ON class_guides(class_id);
  CREATE INDEX IF NOT EXISTS idx_class_guides_guide    ON class_guides(guide_id);
`);
```

Also add the new plan value to any plan-check docs/comments:
  'free' | 'pro' | 'lifetime' | 'teacher'

---

## 2. Server — register the router (server/server.js or app.js)

```js
import classroomRouter from "./routes/classroom/classroom.js";
app.use("/api/classroom", classroomRouter);
```

---

## 3. Stripe — create the Teacher product

In Stripe dashboard:
- Product: "StudyBuddi Teacher"
- Price: $19.00/month recurring  (price ID: save as STRIPE_TEACHER_PRICE_ID in Railway)
- Annual price: $149.00/year recurring

In server/routes/stripe.js (existing), add a handler for the teacher plan:
- On checkout.session.completed: set user.plan = 'teacher'
- On customer.subscription.deleted: set user.plan = 'free'

---

## 4. Frontend — add routes (client/src/App.jsx)

```jsx
// Add these lazy imports:
const TeacherDashboard  = lazyWithRetry(() => import("./pages/classroom/TeacherDashboard.jsx"));
const ClassManage       = lazyWithRetry(() => import("./pages/classroom/ClassManage.jsx"));
const StudentClassroom  = lazyWithRetry(() => import("./pages/classroom/StudentClassroom.jsx"));

// Add a TeacherRoute guard (similar to ProtectedRoute):
function TeacherRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.plan !== "teacher") return <Navigate to="/dashboard" replace />;
  return children;
}

// Add these routes inside <Routes>:
<Route path="/teacher"              element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
<Route path="/teacher/classes/:id"  element={<TeacherRoute><ClassManage /></TeacherRoute>} />
<Route path="/classroom"            element={<ProtectedRoute><StudentClassroom /></ProtectedRoute>} />
```

---

## 5. Navigation — add links

**Teacher** (in sidebar/nav for plan=teacher users):
  - "My Classes" → /teacher

**Students** (in sidebar/nav for all logged-in users):
  - "My Classes" → /classroom  (only show if user has at least 1 class membership)

---

## 6. Student guide access

Students access shared guides via the existing `/guide/:id` route — it already
renders guide content. The only change needed: in the guide fetch endpoint
(`GET /api/guides/:id`), add a second ownership check that also allows access
if the requesting user is a member of any class that has shared this guide:

```js
// In server/routes/guides.js — GET /:id
// After the "guide not found" check, add:
if (guide.user_id !== req.user.id) {
  const classAccess = db.prepare(`
    SELECT 1 FROM class_guides cg
    JOIN class_members cm ON cm.class_id = cg.class_id
    WHERE cg.guide_id = ? AND cm.student_id = ?
  `).get(guide.id, req.user.id);
  if (!classAccess) return res.status(403).json({ error: "Access denied." });
  // Student can read but not edit — pass a flag so client can hide edit UI
  return res.json({ ...guide, readonly: true });
}
```

---

## 7. Pricing page

Add a Teacher plan card between Pro and Lifetime:
- $19/month or $149/year
- "Up to 35 students per class"
- "Up to 5 classes"  
- "Unlimited study guides"
- "Students access for free"
- CTA → Stripe checkout with STRIPE_TEACHER_PRICE_ID
