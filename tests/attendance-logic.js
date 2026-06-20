// ============================================================================
//  attendance-logic.js — pure rules for the monthly-quota attendance model.
//  A student's classes count toward a MONTHLY target (default 8, ~2 a week,
//  editable). There is NO per-day or per-week limit: two on one day, spread
//  across the week, or extra catch-up sessions for a break week all simply add
//  to the monthly count. The target is a goal to reach, never a cap.
// ============================================================================
"use strict";
const PAD = n => String(n).padStart(2, "0");

// Count a student's PRESENT classes in a given month (monthIdx 0-based).
// rows: [{ class_date: "YYYY-MM-DD", status: "present"|"absent"|... }]
function monthlyPresentCount(rows, year, monthIdx) {
  const pre = `${year}-${PAD(monthIdx + 1)}-`;
  return (rows || []).filter(r => r.status === "present" && String(r.class_date || "").startsWith(pre)).length;
}

// Has the student met their monthly target (default 8)?
function metTarget(count, target) { return count >= (Number(target) || 8); }

// Can a session dated sessionDate be marked, given today and a backdate cap (default 30 days)?
// Not in the future, and not older than the cap.
function withinBackdateCap(sessionDateYMD, todayYMD, capDays) {
  if (sessionDateYMD > todayYMD) return false;
  const cap = Number(capDays) || 30;
  return (new Date(todayYMD) - new Date(sessionDateYMD)) <= cap * 864e5;
}

module.exports = { monthlyPresentCount, metTarget, withinBackdateCap, PAD };
