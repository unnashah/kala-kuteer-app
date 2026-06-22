// ============================================================================
//  canary.test.js — "does the LIVE code still match the rules?"
// ----------------------------------------------------------------------------
//  kk-logic.test.js checks the rules in isolation. This file reads the REAL
//  index.html and the REAL student_raise_plan.sql and confirms the key money
//  expressions are still there. If a future edit changes how a fee, due date
//  or payout is worked out, one of these will fail — a loud reminder to re-check
//  the logic (and update kk-logic.js + these tests on purpose, not by accident).
// ============================================================================
"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function (t) {
  const appPath = path.join(__dirname, "..", "index.html");
  const app = fs.readFileSync(appPath, "utf8");
  const sqlPath = path.join(__dirname, "student_raise_plan.sql");
  const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf8") : "";

  const need = (re, app, msg) => { if (!re.test(app)) throw new Error(msg); };

  // --- index.html (the live app) ---
  t("index.html: no IST-unsafe month-end bound (new Date(y,mo,0).toISOString) — last-day-of-month bug must stay fixed", () => {
    if (/new Date\([a-z]+,[a-z]+,0\)\.toISOString\(\)\.slice\(0,10\)/.test(app))
      throw new Error("Found new Date(...,0).toISOString().slice(0,10) — in IST this drops the last day of the month (calendar/finance). Use `${y}-${PAD(mo)}-${PAD(new Date(y,mo,0).getDate())}` instead.");
  });

  t("index.html: due date still caps the enrolment day to the month length", () =>
    need(/PAD\(Math\.min\(day,dim\)\)/, app,
      "Couldn't find PAD(Math.min(day,dim)) in index.html — the due-date capping may have changed. Re-check generateInvoices / adminRaisePlan, then update tests/kk-logic.js and this check on purpose."));

  t("index.html: plan amount is monthly fee × months, with optional discounted 3/6-month plan total", () => {
    need(/let amount=fee\*months/, app,
      "Couldn't find 'let amount=fee*months' in adminRaisePlan — the base plan amount logic may have changed.");
    need(/months===3 && s\.branches\.plan_3_price!=null/, app,
      "The discounted 3-month plan-price override disappeared from adminRaisePlan in index.html.");
    need(/months===6 && s\.branches\.plan_6_price!=null/, app,
      "The discounted 6-month plan-price override disappeared from adminRaisePlan in index.html.");
  });

  t("index.html: guru share is still round(base × pct ÷ 100)", () =>
    need(/Math\.round\(base\*pct\/100\)/, app,
      "Couldn't find Math.round(base*pct/100) in index.html — the payout share formula may have changed."));

  t("index.html: final payout is still round(share + bonus + reimbursements − deduction)", () =>
    need(/Math\.round\(share\+bonus\+reimb-ded\)/, app,
      "Couldn't find Math.round(share+bonus+reimb-ded) in index.html — the payout formula may have changed."));

  t("index.html: payout base still excludes the registration fee (tuition only)", () =>
    need(/registration invoices have amount 0/i, app,
      "The 'registration excluded / tuition only' marker disappeared from the payout code in index.html — make sure the ₹1,000 registration is not back in the guru payout base."));

  t("index.html: todayIST still shifts to Indian time (UTC+5:30)", () =>
    need(/19800000/, app,
      "The IST offset (19800000 ms) is gone from index.html — date-boundary logic for fees may have changed."));

  t("index.html: family fees sum across all children (Pay-All)", () => {
    need(/const grandTotal=dueInv\.reduce/, app,
      "The family grand-total (grandTotal=dueInv.reduce…) disappeared from renderStudentFees.");
    need(/paidRangesBy\[_ckey\(i\)\]/, app,
      "Per-student+course paid-range logic is gone — a paid course (or sibling) could wrongly hide an unpaid course's fee.");
    need(/_ckey=i=>i\.student_id\+"\|"\+\(i\.course_id\|\|""\)/, app,
      "The course-aware coverage key (_ckey) disappeared from renderStudentFees.");
    need(/payOnlineMulti\('\$\{allIds\.join\(","\)\}','All fees'\)/, app,
      "The family 'Pay everything online' button (payOnlineMulti over allIds) is missing.");
  });

  // --- the deployed database function ---
  if (sql) {
    t("SQL student_raise_plan: due date still uses the enrolment day, capped to month length", () =>
      need(/least\(coalesce\(extract\(day from jdate\)::int, 1\), dim\)/i, sql,
        "The student self-serve due-date rule in tests/student_raise_plan.sql changed — make sure it still matches the office-side rule (enrolment day, capped to the month)."));

    t("SQL student_raise_plan: amount is still (monthly fee × months)", () =>
      need(/coalesce\(bfee,0\) \* p_months/i, sql,
        "The student-plan amount rule in tests/student_raise_plan.sql changed — it should stay monthly_fee × months."));
  } else {
    t("a copy of the deployed SQL is kept for checking", () => {
      throw new Error("tests/student_raise_plan.sql is missing — keep a copy of the deployed function here so its money rules stay version-controlled and checked.");
    });
  }
};
