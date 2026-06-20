create or replace function public.student_raise_plan(p_months int)
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid; jdate date; bfee numeric; allow boolean; p3 numeric; p6 numeric;
  startd date; endd date; duedate date; dim int; lbl text; amt numeric;
  mons text[] := array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
begin
  select s.id, s.join_date, b.monthly_fee, coalesce(b.allow_plans,false), b.plan_3_price, b.plan_6_price
    into sid, jdate, bfee, allow, p3, p6
    from public.students s join public.branches b on b.id = s.branch_id
   where s.profile_id = auth.uid();
  if sid is null then raise exception 'No student linked to this account.'; end if;
  if p_months not in (1,3,6) then raise exception 'Choose 1, 3 or 6 months.'; end if;
  if p_months <> 1 and not allow then raise exception 'This branch offers monthly payment only.'; end if;
  startd := date_trunc('month', current_date)::date;
  if exists (select 1 from public.invoices where student_id = sid and period_start <= startd and period_end >= startd) then
    raise exception 'You already have an invoice covering this month.';
  end if;
  endd := (date_trunc('month', current_date) + make_interval(months => p_months) - interval '1 day')::date;

  -- due date = the student's enrolment day-of-month, capped to the month's length
  dim := extract(day from (startd + interval '1 month - 1 day'))::int;
  duedate := make_date(
               extract(year from startd)::int,
               extract(month from startd)::int,
               least(coalesce(extract(day from jdate)::int, 1), dim)
             );

  lbl := mons[extract(month from startd)::int] || ' ' || extract(year from startd)::text;
  if p_months > 1 then lbl := lbl || ' – ' || mons[extract(month from endd)::int] || ' ' || extract(year from endd)::text; end if;

  -- discounted prepay total when the branch has one set, else monthly_fee × months
  amt := coalesce(bfee,0) * p_months;
  if p_months = 3 and p3 is not null and p3 > 0 then amt := p3; end if;
  if p_months = 6 and p6 is not null and p6 > 0 then amt := p6; end if;

  insert into public.invoices(student_id, period_label, amount, due_date, status, months, period_start, period_end)
    values (sid, lbl, amt, duedate, 'pending', p_months, startd, endd);
end; $$;
grant execute on function public.student_raise_plan(int) to authenticated;
