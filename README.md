# Money-safety checks — what this folder is

This folder is a **safety net for the money parts of the app**: how each fee is
calculated, what day a family is billed on, and how each guru's payout is worked
out. It exists so that a future change — by me or anyone else — **can't quietly
break a number** without someone noticing first.

You don't have to run anything by hand. This is insurance running in the
background. Here's all you need to know.

## The one rule

> **Green ✓ = safe to put the new app live. Red ✗ = stop and check first.**

That's it.

## What it actually checks

- A family is billed on the **same day each month they enrolled** (the 5th stays
  the 5th, the 21st stays the 21st), and that day **falls back sensibly in short
  months** (enrolled on the 31st → 28th/29th in February, 30th in April).
- A fee is always **the branch's monthly fee × the months paid** (1, 3 or 6) —
  no stray discounts or partial amounts.
- A guru is paid a **percentage of tuition only** — never of the one-time ₹1,000
  registration, which stays with the school.
- Late-night payments are dated by the **Indian calendar day**, not UTC.
- It also reads the **real app file** (`index.html`) and the **real database
  function** and confirms those money formulas are still the ones above — so the
  net protects the live code, not just a copy of it.

## Where you'll see the green ✓ or red ✗

Once these files are in your GitHub repo (one-time setup below), GitHub runs the
checks automatically **every time the app changes** — including when you paste a
new `index.html` into the GitHub website. You'll see a small **✓ or ✗ next to the
commit**, and GitHub will email you if one ever fails.

If you'd rather check on a computer with Node installed, run this from the app
folder:

```
npm test
```

## One-time setup to turn on the automatic checks

These files need to live in the GitHub repo alongside `index.html` (they're
already in your project folder here):

- the `tests/` folder
- the `.github/workflows/test.yml` file
- `package.json`

Add them to the repo once (drag-and-drop upload on the GitHub website is fine).
After that it's automatic forever — you never touch it again.

> If you skip the GitHub setup, that's okay: the checks still run whenever I edit
> the app for you, so regressions still get caught. The GitHub setup just adds
> the visible ✓/✗ for edits made without me.

## If a check ever goes red

It means a money rule changed. Either it was an **accident** (revert/fix it), or
it was **on purpose** (then the rule here needs updating to match). Send me the
red ✗ message and I'll sort out which it is — the message says exactly which
number or formula moved.


