// ============================================================================
//  run.js — runs every money/date safety check and prints a clear verdict.
//  Run it with:   node tests/run.js     (or:  npm test)
//  Exit code 0 = all good (safe to deploy).  Exit code 1 = something broke.
// ============================================================================
"use strict";

let pass = 0, fail = 0;
const failed = [];

function t(name, fn) {
  try { fn(); pass++; console.log("  ✓ " + name); }
  catch (e) { fail++; failed.push(name); console.log("  ✗ " + name + "\n        → " + e.message); }
}

console.log("\n  Kala Kuteer — money & date safety checks");
console.log("  ========================================\n");

console.log("  Fee / date / payout rules:");
require("./kk-logic.test.js")(t);

console.log("\n  Live-code check (does index.html still match the rules?):");
require("./canary.test.js")(t);

console.log("\n  ----------------------------------------");
console.log(`  ${pass} passed, ${fail} failed`);

if (fail) {
  console.log("\n  ❌ NOT SAFE TO DEPLOY — a money rule changed unexpectedly.");
  console.log("     Fix the ✗ item(s) above before putting the new app live.\n");
  process.exit(1);
}
console.log("\n  ✅ All money logic is correct — safe to deploy.\n");
