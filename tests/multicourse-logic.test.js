"use strict";
const fs = require("fs"), path = require("path");
const { billCourses, grossByGuru } = require("./multicourse-logic.js");

module.exports = function (t) {
  t("a 2-course student is billed two FULL fees (not one, not split)", () => {
    const rows = billCourses([
      { course_id: "kathak", teacher_id: "guruA", monthly_fee: 4500, status: "active" },
      { course_id: "sitar",  teacher_id: "guruB", monthly_fee: 6000, status: "active" },
    ], "2026-07-05", "2026-07-01");
    if (rows.length !== 2) throw new Error("expected 2 invoices, got " + rows.length);
    const total = rows.reduce((a, r) => a + r.amount, 0);
    if (total !== 10500) throw new Error("expected total 10500, got " + total);
  });

  t("each guru is credited only their OWN course's fee", () => {
    const rows = billCourses([
      { course_id: "kathak", teacher_id: "guruA", monthly_fee: 4500, status: "active" },
      { course_id: "sitar",  teacher_id: "guruB", monthly_fee: 6000, status: "active" },
    ], "2026-07-05", "2026-07-01");
    const g = grossByGuru(rows);
    if (g.guruA !== 4500) throw new Error("guruA should be 4500, got " + g.guruA);
    if (g.guruB !== 6000) throw new Error("guruB should be 6000, got " + g.guruB);
  });

  t("a single-course student bills exactly one full fee (unchanged behaviour)", () => {
    const rows = billCourses([{ course_id: "tabla", teacher_id: "guruC", monthly_fee: 4500, status: "active" }], "2026-07-05", "2026-07-01");
    if (rows.length !== 1 || rows[0].amount !== 4500) throw new Error("single course should bill exactly one 4500 invoice");
  });

  t("on-break or zero-fee courses are NOT billed", () => {
    const rows = billCourses([
      { course_id: "kathak", teacher_id: "guruA", monthly_fee: 4500, status: "on_break" },
      { course_id: "sitar",  teacher_id: "guruB", monthly_fee: 0,    status: "active" },
    ], "2026-07-05", "2026-07-01");
    if (rows.length !== 0) throw new Error("expected 0 billable courses, got " + rows.length);
  });

  t("index.html actually generates invoices per course (wired, not just planned)", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    if (!/student_courses/.test(html)) throw new Error("student_courses is not referenced in the app");
    if (!/course_id:\s*sc\.course_id/.test(html)) throw new Error("per-course invoice (course_id) is not generated");
    if (!/teacher_id:\s*sc\.teacher_id/.test(html)) throw new Error("invoice is not tagged with the course's guru");
  });
};
