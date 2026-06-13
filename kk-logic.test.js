// ============================================================================
//  kk-logic.test.js — checks every money rule with lots of real examples.
//  If any single line here fails, something about fees/dates/payouts changed.
// ============================================================================
"use strict";
const assert = require("assert");
const L = require("./kk-logic.js");
const eq = (a, b) => assert.strictEqual(a, b);

module.exports = function (t) {

  // ---- small helpers ----
  t("PAD pads single digits to two", () => { eq(L.PAD(5), "05"); eq(L.PAD(12), "12"); eq(L.PAD(0), "00"); });

  t("INR shows rupees", () => {
    eq(L.INR(0), "₹0");
    eq(L.INR(5000), "₹5,000");
    eq(L.INR(50000), "₹50,000");
    assert.ok(L.INR(1234567).startsWith("₹"));      // is a rupee string
    assert.ok(L.INR(1234567).includes(","));        // grouped with separators
  });

  t("daysInMonth knows month lengths and leap years", () => {
    eq(L.daysInMonth(2026, 0), 31);   // January
    eq(L.daysInMonth(2026, 1), 28);   // February 2026 (not a leap year)
    eq(L.daysInMonth(2028, 1), 29);   // February 2028 (leap year)
    eq(L.daysInMonth(2026, 3), 30);   // April
    eq(L.daysInMonth(2026, 11), 31);  // December
  });

  // ---- THE BIG ONE: due date = enrolment day, every month ----
  t("billing day keeps the enrolment day (5th stays the 5th, 21st stays the 21st)", () => {
    eq(L.dueDate("2025-08-05", 2026, 0), "2026-01-05");
    eq(L.dueDate("2025-08-05", 2026, 6), "2026-07-05");
    eq(L.dueDate("2025-08-21", 2026, 0), "2026-01-21");
    eq(L.dueDate("2025-08-21", 2026, 5), "2026-06-21");
    eq(L.dueDate("2024-12-01", 2026, 2), "2026-03-01");
  });

  t("a 31st enrolment is capped to the last day in short months", () => {
    eq(L.dueDate("2025-01-31", 2026, 0), "2026-01-31"); // Jan has 31 -> unchanged
    eq(L.dueDate("2025-01-31", 2026, 1), "2026-02-28"); // Feb (non-leap) -> 28
    eq(L.dueDate("2025-01-31", 2028, 1), "2028-02-29"); // Feb (leap)     -> 29
    eq(L.dueDate("2025-01-31", 2026, 3), "2026-04-30"); // Apr has 30     -> 30
    eq(L.dueDate("2025-01-31", 2026, 5), "2026-06-30"); // Jun has 30     -> 30
  });

  t("a 30th enrolment is capped only in February", () => {
    eq(L.dueDate("2025-04-30", 2026, 1), "2026-02-28");
    eq(L.dueDate("2025-04-30", 2026, 3), "2026-04-30");
  });

  t("no enrolment date on file falls back to the 1st", () => {
    eq(L.dueDate(null, 2026, 5), "2026-06-01");
    eq(L.dueDate("", 2026, 11), "2026-12-01");
  });

  // ---- amounts: fee x months, no discounts/partials ----
  t("amount is the monthly fee times the months paid", () => {
    eq(L.invoiceAmount(5000, 1), 5000);    // Tarnaka monthly
    eq(L.invoiceAmount(5000, 3), 15000);   // Tarnaka quarterly
    eq(L.invoiceAmount(6000, 1), 6000);    // Gachibowli monthly
    eq(L.invoiceAmount(6000, 6), 36000);   // Gachibowli half-year
    eq(L.invoiceAmount(0, 3), 0);          // no fee set -> 0
  });

  // ---- period coverage for 1/3/6-month plans ----
  t("a plan's period ends on the last day of the span it covers", () => {
    eq(L.periodEnd(2026, 0, 1), "2026-01-31");   // Jan only
    eq(L.periodEnd(2026, 0, 3), "2026-03-31");   // Jan–Mar
    eq(L.periodEnd(2026, 0, 6), "2026-06-30");   // Jan–Jun
    eq(L.periodEnd(2026, 1, 1), "2026-02-28");   // Feb only (non-leap)
    eq(L.periodEnd(2026, 10, 3), "2027-01-31");  // Nov–Jan, crosses into next year
    eq(L.periodEnd(2027, 11, 6), "2028-05-31");  // Dec–May, crosses year
  });

  // ---- overdue vs pending ----
  t("an invoice is overdue only after its due date passes", () => {
    eq(L.invoiceStatus("2026-06-10", "2026-06-13"), "overdue");
    eq(L.invoiceStatus("2026-06-12", "2026-06-13"), "overdue");
    eq(L.invoiceStatus("2026-06-13", "2026-06-13"), "pending"); // due today is NOT overdue yet
    eq(L.invoiceStatus("2026-06-20", "2026-06-13"), "pending");
  });

  // ---- the Indian-day boundary ----
  t("todayIST uses the Indian calendar day, even late at night UTC", () => {
    // 2026-06-13 20:00 UTC = 2026-06-14 01:30 IST -> should already be the 14th in India
    const utc = Date.UTC(2026, 5, 13, 20, 0, 0);
    eq(L.todayIST(utc), "2026-06-14");
    // 2026-06-13 10:00 UTC = 2026-06-13 15:30 IST -> still the 13th
    eq(L.todayIST(Date.UTC(2026, 5, 13, 10, 0, 0)), "2026-06-13");
  });

  // ---- guru payouts ----
  t("payout = share + bonus - deduction, with share = base x pct%", () => {
    let p = L.guruPayout(5000, 40, 0, 0, 0);       // 40% of 5000
    eq(p.share, 2000); eq(p.final, 2000); eq(p.balance, 2000);

    p = L.guruPayout(5000, 40, 500, 200, 0);        // + bonus 500 − deduction 200
    eq(p.final, 2300);

    p = L.guruPayout(6000, 50, 0, 0, 1000);         // 50% of 6000, already paid 1000
    eq(p.share, 3000); eq(p.final, 3000); eq(p.balance, 2000);
  });

  t("the ₹1,000 registration is NOT in the payout base", () => {
    // base is tuition-only by construction; a registration-only month means base 0
    const p = L.guruPayout(0, 40, 0, 0, 0);
    eq(p.base, 0); eq(p.share, 0); eq(p.final, 0);
  });

  t("payouts are rounded to whole rupees", () => {
    eq(L.guruPayout(5000, 33, 0, 0, 0).share, 1650);   // 1650.0
    eq(L.guruPayout(4999, 33, 0, 0, 0).share, 1650);   // 1649.67 -> 1650
    eq(L.guruPayout(5001, 33, 0, 0, 0).share, 1650);   // 1650.33 -> 1650
  });

  t("a fully-paid guru shows a zero balance", () => {
    const p = L.guruPayout(5000, 40, 0, 0, 2000);
    eq(p.balance, 0);
  });
};
