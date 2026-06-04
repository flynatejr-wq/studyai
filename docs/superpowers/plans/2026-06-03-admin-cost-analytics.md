# Admin Cost Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cost Analytics tab to the admin dashboard showing estimated API spend per user and platform-wide totals.

**Architecture:** A new `GET /api/admin/cost-stats` endpoint in the existing `admin.js` route computes estimated costs from existing `guides_created_ever` and `total_quizzes` columns using fixed per-unit rates. The Admin frontend gains a "Cost" tab that fetches this endpoint and renders 3 summary cards and a top-25 user cost table.

**Tech Stack:** Node/Express, better-sqlite3, React, Tailwind CSS, lucide-react

---

## File Map

| File | Action | What changes |
|---|---|---|
| `server/routes/admin.js` | Modify | Add `GET /cost-stats` endpoint |
| `client/src/pages/Admin.jsx` | Modify | Add Cost tab, summary cards, user cost table |
| `client/src/api.js` | Modify | Add `api.admin.costStats()` method |

---

## Cost Constants

These rates match the current model setup (all Haiku):
- Guide: `$0.002` per guide (`guides_created_ever`)
- Quiz: `$0.006` per quiz (`total_quizzes`)

---

## Task 1: Backend — cost-stats endpoint

**Files:**
- Modify: `server/routes/admin.js` (after the existing `/stats` route, around line 91)

- [ ] **Step 1: Add the cost-stats endpoint**

Find the closing `});` of the existing `router.get("/stats", ...)` handler (around line 91). Directly after it, add:

```js
// ── Cost analytics ────────────────────────────────────────────────────────────
const COST_PER_GUIDE = 0.002; // Haiku guide generation
const COST_PER_QUIZ  = 0.006; // Haiku quiz generation

router.get("/cost-stats", (req, res) => {
  // Platform totals
  const totals = db.prepare(`
    SELECT
      SUM(guides_created_ever) as total_guides,
      SUM(total_quizzes)       as total_quizzes,
      COUNT(*)                 as total_users,
      SUM(CASE WHEN plan = 'pro' OR plan = 'lifetime' THEN 1 ELSE 0 END) as paid_users
    FROM users
  `).get();

  const totalGuideCost = (totals.total_guides || 0) * COST_PER_GUIDE;
  const totalQuizCost  = (totals.total_quizzes || 0) * COST_PER_QUIZ;
  const totalCost      = totalGuideCost + totalQuizCost;
  const avgCostPerUser = totals.total_users > 0 ? totalCost / totals.total_users : 0;
  const avgCostPerPaid = totals.paid_users > 0
    ? db.prepare(`
        SELECT SUM(guides_created_ever * ? + total_quizzes * ?) as cost
        FROM users WHERE plan IN ('pro', 'lifetime')
      `).get(COST_PER_GUIDE, COST_PER_QUIZ).cost / totals.paid_users
    : 0;

  // Top 25 users by estimated cost
  const topUsers = db.prepare(`
    SELECT id, name, email, plan,
           guides_created_ever,
           total_quizzes,
           (guides_created_ever * ? + total_quizzes * ?) as estimated_cost
    FROM users
    ORDER BY estimated_cost DESC
    LIMIT 25
  `).all(COST_PER_GUIDE, COST_PER_QUIZ);

  res.json({
    summary: {
      totalCost,
      totalGuideCost,
      totalQuizCost,
      avgCostPerUser,
      avgCostPerPaid,
      totalUsers: totals.total_users,
      paidUsers: totals.paid_users,
    },
    topUsers,
  });
});
```

- [ ] **Step 2: Commit backend**

```bash
git add server/routes/admin.js
git commit -m "feat: add GET /api/admin/cost-stats endpoint"
```

---

## Task 2: Frontend API method

**Files:**
- Modify: `client/src/api.js`

- [ ] **Step 1: Add costStats method to the admin API object**

Find the `admin` object in `api.js` (look for `admin:` key). Add `costStats` alongside existing admin methods:

```js
costStats: () => authFetch("/admin/cost-stats"),
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api.js
git commit -m "feat: add api.admin.costStats() method"
```

---

## Task 3: Frontend — Cost tab in Admin.jsx

**Files:**
- Modify: `client/src/pages/Admin.jsx`

- [ ] **Step 1: Add DollarSign to lucide-react imports**

Find the lucide-react import line at the top of Admin.jsx:
```js
import {
  Shield, Users, BarChart2, Search, RefreshCw, X, ChevronLeft,
  ChevronRight, Crown, Ban, Star, Zap, Clock, BookOpen, CheckCircle,
  AlertTriangle, Activity, Filter, RotateCcw, Save, ChevronDown,
  Fingerprint, Trash2, Flag, Lock, Unlock, EyeOff,
} from "lucide-react";
```
Add `DollarSign` to the list:
```js
import {
  Shield, Users, BarChart2, Search, RefreshCw, X, ChevronLeft,
  ChevronRight, Crown, Ban, Star, Zap, Clock, BookOpen, CheckCircle,
  AlertTriangle, Activity, Filter, RotateCcw, Save, ChevronDown,
  Fingerprint, Trash2, Flag, Lock, Unlock, EyeOff, DollarSign,
} from "lucide-react";
```

- [ ] **Step 2: Add CostTab component**

Find the end of the file just before `export default`. Add this component above the export:

```jsx
// ── Cost Analytics Tab ────────────────────────────────────────────────────────
function CostTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.admin.costStats()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const fmt = (n) => `$${(n || 0).toFixed(4)}`;
  const fmtShort = (n) => `$${(n || 0).toFixed(2)}`;

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading cost data…
    </div>
  );
  if (error) return (
    <div className="text-red-400 text-sm py-10 text-center">{error}</div>
  );
  if (!data) return null;

  const { summary, topUsers } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total API Spend (all time)", value: fmtShort(summary.totalCost), sub: `Guides: ${fmtShort(summary.totalGuideCost)} · Quizzes: ${fmtShort(summary.totalQuizCost)}` },
          { label: "Avg Cost / User", value: fmt(summary.avgCostPerUser), sub: `Across ${summary.totalUsers} users` },
          { label: "Avg Cost / Paid User", value: fmt(summary.avgCostPerPaid), sub: `Across ${summary.paidUsers} paid users` },
        ].map(card => (
          <div key={card.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-white text-2xl font-bold">{card.value}</p>
            <p className="text-gray-500 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Top users table */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <DollarSign size={15} className="text-indigo-400" />
          <p className="text-white font-semibold text-sm">Top 25 Users by Estimated Cost</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-right px-4 py-3">Guides</th>
                <th className="text-right px-4 py-3">Quizzes</th>
                <th className="text-right px-5 py-3">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{u.name || "—"}</p>
                    <p className="text-gray-500 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.guides_created_ever}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{u.total_quizzes}</td>
                  <td className="px-5 py-3 text-right font-mono text-indigo-300 font-semibold">{fmt(u.estimated_cost)}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add "Cost" to the tab list**

Find the tabs array in the main Admin component. It likely looks like:
```jsx
const tabs = [
  { id: "stats",   label: "Stats",      icon: BarChart2 },
  { id: "users",   label: "Users",      icon: Users     },
  { id: "audit",   label: "Audit Log",  icon: Clock     },
  { id: "abuse",   label: "Abuse",      icon: Shield    },
];
```
Add the Cost tab:
```jsx
const tabs = [
  { id: "stats",   label: "Stats",      icon: BarChart2    },
  { id: "users",   label: "Users",      icon: Users        },
  { id: "audit",   label: "Audit Log",  icon: Clock        },
  { id: "abuse",   label: "Abuse",      icon: Shield       },
  { id: "cost",    label: "Cost",       icon: DollarSign   },
];
```

- [ ] **Step 4: Add Cost tab render block**

Find where other tabs are conditionally rendered (look for `activeTab === "stats"`, `activeTab === "users"`, etc.). Add the Cost tab render block alongside them:

```jsx
{activeTab === "cost" && <CostTab />}
```

- [ ] **Step 5: Commit frontend**

```bash
git add client/src/pages/Admin.jsx client/src/api.js
git commit -m "feat: add Cost Analytics tab to admin dashboard"
```

---

## Task 4: Push

- [ ] **Step 1: Push to production**

```bash
git push
```

- [ ] **Step 2: Verify in browser**

Navigate to `/admin`, click the **Cost** tab. Confirm:
- 3 summary cards show dollar values
- Top 25 table renders with user name, email, plan badge, guide/quiz counts, and estimated cost
- Table sorted by cost descending
