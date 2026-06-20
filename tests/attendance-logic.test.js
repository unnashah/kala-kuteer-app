// ============================================================================
//  attendance-logic.test.js — checks the monthly-quota attendance rules.
// ============================================================================
"use strict";
const assert = require("assert");
const A = require("./attendance-logic.js");
const eq = (a, b) => assert.strictEqual(a, b);

module.exports = function (t) {
  const rows = [
    { class_date: "2026-06-02", status: "present" },
    { class_date: "2026-06-05", status: "present" },
    { class_date: "2026-06-09", status: "absent"  },
    { class_date: "2026-06-12", status: "present" },
    { class_date: "2026-06-12", status: "present" },  // a 2nd class same day (make-up) counts
    { class_date: "2026-05-30", status: "present" },  // previous month, excluded
  ];

  t("monthly count tallies only PRESENT classes in that month (incl. 2 in one day)", () => {
    eq(A.monthlyPresentCount(rows, 2026, 5), 4);   // June: 2,5,12,12
    eq(A.monthlyPresentCount(rows, 2026, 4), 1);   // May: 30
    eq(A.monthlyPresentCount(rows, 2026, 0), 0);   // January: none
  });

  t("monthly target defaults to 8 and is comparable", () => {
    eq(A.metTarget(8, null), true);
    eq(A.metTarget(7, 8), false);
    eq(A.metTarget(8, 8), true);
    eq(A.metTarget(10, 8), true);
  });

  t("backdate cap: today and recent past OK; future or too-old rejected", () => {
    eq(A.withinBackdateCap("2026-06-13", "2026-06-13", 30), true);   // today
    eq(A.withinBackdateCap("2026-05-20", "2026-06-13", 30), true);   // 24 days back
    eq(A.withinBackdateCap("2026-05-10", "2026-06-13", 30), false);  // 34 days back
    eq(A.withinBackdateCap("2026-06-20", "2026-06-13", 30), false);  // future
  });
};
