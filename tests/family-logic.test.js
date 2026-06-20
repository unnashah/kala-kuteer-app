// ============================================================================
//  family-logic.test.js — combined family fees: one login, several students.
//  Verifies the grand total sums DUE invoices across all children, and that
//  one child's paid period never "covers" (hides) another child's due fee.
// ============================================================================
"use strict";

// Mirror of the app's family-fee computation (renderStudentFees).
function familyDue(list) {
  const ckey = i => i.student_id + "|" + (i.course_id || "");
  const paidRangesBy = {};
  list.filter(i => i.status === "paid" && i.period_start && i.period_end)
      .forEach(i => { const k = ckey(i); (paidRangesBy[k] = paidRangesBy[k] || []).push([i.period_start, i.period_end]); });
  const coveredFee = i => {
    const ref = i.period_start || i.due_date;
    const rs = paidRangesBy[ckey(i)] || [];
    return ref && rs.some(r => r[0] <= ref && r[1] >= ref);
  };
  const dueInv = list.filter(i => i.status !== "paid" && !coveredFee(i));
  const grandTotal = dueInv.reduce((a, i) => a + Number(i.amount || 0), 0);
  return { dueInv, grandTotal };
}

module.exports = function (t) {
  const invs = [
    { id: 1, student_id: "A", amount: 6000, status: "pending", period_start: "2026-07-01", period_end: "2026-07-31", due_date: "2026-07-05" },
    { id: 2, student_id: "A", amount: 6000, status: "paid",    period_start: "2026-06-01", period_end: "2026-06-30" },
    { id: 4, student_id: "A", amount: 6000, status: "pending", period_start: "2026-06-01", period_end: "2026-06-30", due_date: "2026-06-05" }, // A already paid June → excluded
    { id: 3, student_id: "B", amount: 6000, status: "pending", period_start: "2026-06-01", period_end: "2026-06-30", due_date: "2026-06-05" }, // B has NOT paid June → due
  ];
  const { dueInv, grandTotal } = familyDue(invs);

  t("family total adds up every child's DUE fee", () =>
    { if (grandTotal !== 12000) throw new Error("Expected family grand total 12000, got " + grandTotal); });

  t("a child's paid month never hides their OWN later/again invoice", () =>
    { if (dueInv.some(i => i.id === 4)) throw new Error("Invoice 4 (A, June, already paid) should be excluded."); });

  t("one child's payment does NOT cover a sibling's same-month fee", () =>
    { if (!dueInv.some(i => i.id === 3)) throw new Error("Invoice 3 (B, June) must stay due — A's payment must not cover B."); });

  t("Pay-All would target exactly the still-due invoices", () =>
    { const ids = dueInv.map(i => i.id).sort(); if (ids.join(",") !== "1,3") throw new Error("Pay-All ids should be [1,3], got [" + ids.join(",") + "]"); });

  // multi-course: one student, two courses, same month — paying one course must NOT hide the other
  const mc = [
    { id: 10, student_id: "A", course_id: "vocal", amount: 6000, status: "paid",    period_start: "2026-06-01", period_end: "2026-06-30" },
    { id: 11, student_id: "A", course_id: "tabla", amount: 6000, status: "pending", period_start: "2026-06-01", period_end: "2026-06-30", due_date: "2026-06-05" },
  ];
  const mcDue = familyDue(mc);
  t("paying one course does NOT hide an unpaid different course in the same month", () =>
    { if (!mcDue.dueInv.some(i => i.id === 11)) throw new Error("Tabla (unpaid) must stay due even though Vocal (same month) is paid."); });
  t("multi-course family total counts only the unpaid course", () =>
    { if (mcDue.grandTotal !== 6000) throw new Error("Expected 6000 (only the unpaid course), got " + mcDue.grandTotal); });
};
