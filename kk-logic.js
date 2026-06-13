// ============================================================================
//  kk-logic.js  —  The single source of truth for Kala Kuteer's MONEY rules.
// ----------------------------------------------------------------------------
//  Every fee amount, due date and guru payout in the app is supposed to follow
//  exactly these rules. The live app (index.html) and the database function
//  (student_raise_plan) must always agree with what's written here.
//
//  These are PURE functions — no screen, no internet — so a computer can check
//  them automatically. If anyone ever changes how money is calculated, the
//  tests next to this file will catch a mismatch before it reaches real fees.
//
//  Plain-English summary of the rules:
//    • A family is billed on the SAME day each month that they enrolled
//      (enrolled on the 5th -> billed on the 5th; the 21st -> the 21st).
//    • If that day doesn't exist in a short month, it falls back to the last
//      day (enrolled on the 31st -> 28th/29th in Feb, 30th in April).
//    • A fee is the branch's monthly fee times the number of months paid
//      (1, 3 or 6). No discounts, no partial amounts.
//    • A guru is paid a % of the TUITION their students paid — never of the
//      one-time ₹1,000 registration (that stays with the school).
// ============================================================================
"use strict";

const MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Pad a number to two digits: 5 -> "05", 12 -> "12".
const PAD = n => String(n).padStart(2, "0");

// Show an amount as Indian rupees: 50000 -> "₹50,000".
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");

// Turn a "YYYY-MM-DD" string into a real date (without timezone surprises).
function parseD(s){ const [y,m,d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); }

// How many days a month has. monthIdx is 0-based (0 = January). Handles leap years.
function daysInMonth(year, monthIdx){ return new Date(year, monthIdx + 1, 0).getDate(); }

// The day-of-month a student is billed on for a given month:
// their enrolment day, but never past the end of a short month.
function billingDay(joinDate, year, monthIdx){
  const day = joinDate ? parseD(String(joinDate).slice(0,10)).getDate() : 1;
  return Math.min(day, daysInMonth(year, monthIdx));
}

// The full due date ("YYYY-MM-DD") for the month described by (year, monthIdx).
function dueDate(joinDate, year, monthIdx){
  return `${year}-${PAD(monthIdx + 1)}-${PAD(billingDay(joinDate, year, monthIdx))}`;
}

// What to charge = the monthly fee times the number of months paid for.
function invoiceAmount(monthlyFee, months){ return Number(monthlyFee || 0) * Number(months); }

// The last day ("YYYY-MM-DD") of a 1/3/6-month span that starts in (year, monthIdx).
function periodEnd(year, monthIdx, months){
  const d = new Date(year, monthIdx + Number(months), 0);
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

// An invoice is "overdue" once its due date is before today; otherwise "pending".
// (Both are plain "YYYY-MM-DD" strings, which compare correctly as text.)
function invoiceStatus(dueYMD, todayYMD){ return dueYMD < todayYMD ? "overdue" : "pending"; }

// Today's date in India (UTC+5:30) as "YYYY-MM-DD" — so a late-night payment
// is dated by the Indian calendar day, not the server's UTC day.
function todayIST(now){ return new Date((now == null ? Date.now() : now) + 19800000).toISOString().slice(0, 10); }

// A guru's payout for one month.
//   base       = tuition collected for that guru's students (registration already excluded)
//   pct        = the guru's agreed share %
//   bonus/ded  = optional manual adjustments
//   alreadyPaid= what the school has already paid them this month
// share = round(base × pct/100);  final = round(share + bonus − deduction);  balance = final − alreadyPaid
function guruPayout(base, pct, bonus, deduction, alreadyPaid){
  base = Math.round(Number(base) || 0);
  const share = Math.round(base * (Number(pct) || 0) / 100);
  const final = Math.round(share + (Number(bonus) || 0) - (Number(deduction) || 0));
  return { base, share, final, balance: final - Math.round(Number(alreadyPaid) || 0) };
}

module.exports = {
  MONS, PAD, INR, parseD, daysInMonth, billingDay,
  dueDate, invoiceAmount, periodEnd, invoiceStatus, todayIST, guruPayout
};
