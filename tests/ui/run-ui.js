/* Kala Kuteer — UI smoke / screen-walk tests (network-isolated, headless DOM).
   Boots the real index.html as each role, clicks through EVERY sidebar screen,
   and fails if any screen throws or renders blank. Also checks the security
   sanitiser (sanHTML) and pure helpers in a real DOM. No live data is touched. */
const fs = require("fs");
const path = require("path");
const { boot } = require("./harness");

const APP = process.env.KK_APP || path.join(__dirname, "..", "..", "index.html");
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail) { if (cond) { pass++; console.log("  \u2713 " + name); } else { fail++; fails.push(name + (detail ? " — " + detail : "")); console.log("  \u2717 " + name + (detail ? " — " + detail : "")); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function walkRole(role, expectMin) {
  console.log(`\n▶ Role: ${role}`);
  const { window, document, errors } = await boot({ role, appPath: APP });
  const nav = document.getElementById("sideNav");
  const items = nav ? [...nav.querySelectorAll(".navitem")] : [];
  ok(`${role}: shell + sidebar renders`, items.length >= expectMin, `${items.length} nav items`);
  ok(`${role}: no errors during boot`, errors.length === 0, errors[0]);

  for (const item of items) {
    const key = item.dataset.key;
    const before = errors.length;
    try { item.click(); } catch (e) { errors.push("click " + key + ": " + (e.stack || e)); }
    await sleep(250); // let any async render settle
    const main = document.getElementById("mainArea");
    const filled = main && main.innerHTML.trim().length > 0;
    const threw = errors.length > before;
    ok(`${role} › ${key}: renders without error`, filled && !threw, threw ? errors[errors.length - 1].slice(0, 220) : (!filled ? "mainArea empty" : ""));
  }
  return window;
}

function checkSanitiser(window) {
  console.log("\n▶ Security: sanHTML neutralises stored-HTML XSS");
  const san = (h)=>{ window.__san=h; return window.eval("sanHTML(window.__san)"); };
  ok("sanHTML is defined", typeof window.eval("typeof sanHTML")==="string" && window.eval("typeof sanHTML")==="function");
  const cases = [
    ["script tag", '<script>window.__pwn=1</script>hello', ["<script", "__pwn"], "hello"],
    ["img onerror", '<img src=x onerror="window.__pwn=1">', ["onerror", "<img"], null],
    ["svg onload (slash)", '<svg/onload=alert(1)>', ["onload", "<svg"], null],
    ["js: href", '<a href="javascript:alert(1)">link</a>', ["javascript:"], "link"],
    ["entity js: href", '<a href="&#106;avascript:alert(1)">link</a>', ["javascript:"], "link"],
    ["onclick attr", '<div onclick="window.__pwn=1">safe</div>', ["onclick"], "safe"],
    ["iframe", '<iframe src="https://evil.test"></iframe>ok', ["<iframe"], "ok"],
  ];
  for (const [label, input, banned, keep] of cases) {
    const out = String(san(input) || "");
    const low = out.toLowerCase();
    const clean = banned.every((b) => low.indexOf(b.toLowerCase()) === -1);
    ok(`sanHTML removes ${label}`, clean, "got: " + out.slice(0, 120));
    if (keep) ok(`sanHTML keeps text for ${label}`, out.indexOf(keep) !== -1, "got: " + out.slice(0, 120));
  }
  ok("sanHTML did not execute payload", window.__pwn === undefined);
}

function checkHelpers(window) {
  console.log("\n\u25b6 Helpers: esc / safeUrl / todayIST");
  const ev = (expr, arg) => { if (arg !== undefined) window.__arg = arg; return window.eval(expr); };
  ok("esc escapes angle/amp/quote", ev("esc(window.__arg)", '<b>&"x') === '&lt;b&gt;&amp;&quot;x', "got: " + ev("esc(window.__arg)", '<b>&"x'));
  ok("safeUrl blocks javascript:", ev("safeUrl(window.__arg)", "javascript:alert(1)") === "#");
  ok("safeUrl allows https", ev("safeUrl(window.__arg)", "https://kalakuteer.org") === "https://kalakuteer.org");
  ok("todayIST is YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(window.eval("todayIST()")));
}

function checkConstants() {
  console.log("\n▶ Static guard: single gateway-fee constant");
  const src = fs.readFileSync(APP, "utf8");
  ok("GATEWAY_PCT constant present (0.0236)", /const\s+GATEWAY_PCT\s*=\s*0\.0236/.test(src));
  ok("no stray duplicate 0.0236 literal beyond the constant", (src.match(/0\.0236/g) || []).length <= 1, (src.match(/0\.0236/g) || []).length + " occurrences");
}

(async () => {
  console.log("Kala Kuteer — UI smoke tests (headless DOM, no live data)");
  const w = await walkRole("super_admin", 17);
  await walkRole("teacher", 8);
  await walkRole("student", 7);
  checkSanitiser(w);
  checkHelpers(w);
  checkConstants();
  console.log(`\n──────────\n${fail === 0 ? "✅" : "❌"} UI smoke: ${pass} passed, ${fail} failed`);
  if (fail) { console.log("Failures:\n - " + fails.join("\n - ")); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.error("RUNNER CRASHED:", e); process.exit(1); });
