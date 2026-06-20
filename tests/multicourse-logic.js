"use strict";
// ============================================================================
//  multicourse-logic.js — pure mirror of the multi-course money rules.
//  Keep in sync with generateInvoices()/payout logic in index.html.
//  Rule: bill ONE full-fee invoice per ACTIVE course; each invoice carries
//  that course's guru; a guru's gross = sum of their own courses' fees.
// ============================================================================

// Returns one invoice row per billable course (active + fee > 0).
function billCourses(courses, dueYMD, todayYMD) {
  return (courses || [])
    .filter(c => (!c.status || c.status === "active") && Number(c.monthly_fee) > 0)
    .map(c => ({
      course_id: c.course_id,
      teacher_id: c.teacher_id,
      amount: Number(c.monthly_fee),
      status: (dueYMD < todayYMD) ? "overdue" : "pending",
    }));
}

// Payout gross per guru = sum of (collected) invoice amounts grouped by teacher.
function grossByGuru(invoices) {
  const g = {};
  (invoices || []).forEach(i => {
    if (i.teacher_id) g[i.teacher_id] = (g[i.teacher_id] || 0) + Number(i.amount || 0);
  });
  return g;
}

module.exports = { billCourses, grossByGuru };
