/* ===================================================================
   Kala Kuteer — UI smoke harness (network-isolated)
   Loads the REAL index.html in a headless DOM (jsdom), stubs Supabase
   so NOTHING touches the live backend, boots as a chosen role, and
   exposes the window so tests can click through every screen.
   =================================================================== */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const DEFAULT_APP = process.env.KK_APP || path.join(__dirname, "..", "..", "index.html");

const SESSION = {
  access_token: "test-token",
  user: { id: "00000000-0000-0000-0000-000000000001", email: "owner@kalakuteer.test" },
};

function fixtures(role) {
  return {
    profiles: [{ id: SESSION.user.id, role, full_name: "Test Owner", pin_set: true, coc_agreed: true }],
    branches: [
      { id: "b1", name: "Gachibowli", monthly_fee: 6000, registration_fee: 2000, upi_id: "kalakuteer@upi", allow_plans: true, plan_3_price: 16200, plan_6_price: 30000 },
      { id: "b2", name: "Madhapur", monthly_fee: 5000, registration_fee: 1500, allow_plans: false, plan_3_price: null, plan_6_price: null },
    ],
    courses: [{ id: "c1", name: "Vocal", is_active: true }, { id: "c2", name: "Tabla", is_active: true }],
    rooms: [{ id: "r1", name: "Room 1", is_active: true }],
    teachers: [
      { id: "t1", name: "Guru A", full_name: "Guru A", profile_id: "p-t1", coc_agreed: true, zoom_link: "https://zoom.us/j/1" },
      { id: "t2", name: "Guru B", full_name: "Guru B", profile_id: "p-t2", coc_agreed: true },
    ],
    students: role === "student" ? [{ id: "s1", full_name: "Test Child", status: "active", intake_completed: true, is_minor: true, branch_id: "b1", course_id: "c1", level: "Beginner", join_date: "2026-01-10", goal: "Learn", primary_teacher_id: "t1", profile_id: SESSION.user.id, branches: { name: "Gachibowli", upi_id: "kalakuteer@upi" }, courses: { name: "Vocal" } }] : [],
    invoices: [], payments: [], enrollments: [], attendance: [], batches: [],
    class_sessions: [], session_students: [], enquiries: [], inventory: [], inventory_log: [],
    announcements: [], suggestions: [], progress_reviews: [], event_rsvps: [], exam_enrollments: [],
    timeline_entries: [], participations: [], bookings: [], payouts: [], guru_reimbursements: [],
    activity_log: [], events: [], notices: [], app_settings: [],
  };
}

function makeSupabaseStub(role) {
  const FIX = fixtures(role);
  const RPC = { my_student_ids: [], guru_gross_in_range: [], my_guru_earnings: [], my_class_sessions: [], my_online_classes: [] };
  function result(rows, single) {
    return single ? { data: rows.length ? rows[0] : null, error: null }
                  : { data: rows, error: null, count: rows.length };
  }
  function query(table) {
    let single = false;
    const p = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") { const rows = (FIX[table] || []).slice(); const r = result(rows, single); return (res) => res(r); }
        if (prop === "maybeSingle" || prop === "single") { return () => { single = true; return p; }; }
        return () => p;
      },
    });
    return p;
  }
  let authCb = null;
  const auth = {
    getSession: async () => ({ data: { session: SESSION }, error: null }),
    getUser: async () => ({ data: { user: SESSION.user }, error: null }),
    onAuthStateChange: (cb) => { authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async () => { if (authCb) setTimeout(() => authCb("SIGNED_IN", SESSION), 0); return { data: { session: SESSION, user: SESSION.user }, error: null }; },
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: SESSION.user }, error: null }),
  };
  const client = {
    auth,
    from: (table) => query(table),
    rpc: async (fn) => ({ data: RPC[fn] !== undefined ? RPC[fn] : [], error: null }),
    functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
  return { createClient: () => client };
}

function stubBrowser(window) {
  const noop = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, media: "", onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: () => false }));
  window.scrollTo = noop;
  if (window.Element) window.Element.prototype.scrollIntoView = noop;
  window.print = noop;
  window.alert = noop; window.confirm = () => false; window.prompt = () => null;
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = noop;
  class Ob { observe() {} unobserve() {} disconnect() {} }
  window.ResizeObserver = window.ResizeObserver || Ob;
  window.IntersectionObserver = window.IntersectionObserver || Ob;
  try { window.URL.createObjectURL = () => "blob:test"; window.URL.revokeObjectURL = noop; } catch (e) {}
  try { Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true }); } catch (e) {}
  try { Object.defineProperty(window.navigator, "share", { value: async () => {}, configurable: true }); } catch (e) {}
}

async function boot({ role = "super_admin", appPath = DEFAULT_APP } = {}) {
  const html = fs.readFileSync(appPath, "utf8");
  const errors = []; const warnings = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: undefined,
    pretendToBeVisual: true,
    url: "https://localhost/",
    beforeParse(window) {
      window.supabase = makeSupabaseStub(role);
      stubBrowser(window);
      window.addEventListener("error", (e) => errors.push(String((e && e.error && e.error.stack) || (e && e.message) || e)));
      window.addEventListener("unhandledrejection", (e) => errors.push("unhandledrejection: " + String((e && e.reason && e.reason.stack) || (e && e.reason) || e)));
      const origErr = window.console.error.bind(window.console);
      window.console.error = (...a) => { warnings.push(a.map(String).join(" ")); };
    },
  });
  const { window } = dom;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 80));
    const nav = window.document.getElementById("sideNav");
    const app = window.document.getElementById("app");
    const appHidden = app && app.classList.contains("hide");
    if (nav && nav.children.length > 0 && !appHidden) break;
  }
  return { dom, window, document: window.document, errors, warnings };
}

module.exports = { boot, SESSION };
