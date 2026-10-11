# SpendWise — Broke But Functional: Survive the Month

A responsive, client-side personal finance simulator built for the FrontendArena hackathon.

## Features
- ₹10,000 / 30-day budget dashboard
- Live balance, spending, commitment, daily allowance, and month-end forecast
- Expense logging with category breakdown
- Commitment management (edit, add, remove)
- Savings goal editor
- What-if simulator for purchases, emergencies, subscription cancellation, and extra income
- Financial health score and low/medium/high risk indicators
- Browser persistence with LocalStorage
- Responsive layout, semantic HTML, accessible form labels, keyboard focus styles, reduced-motion support
- No bank credentials, third-party APIs, or sensitive data required

## Run locally
Open `index.html` in a browser. For best results, use VS Code with the Live Server extension.

## Deploy on Vercel
1. Create a public GitHub repository named `spendwise`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. In Vercel, import that repository. Choose the `Other` framework preset if asked; no build command is needed.
4. Deploy. Copy the public deployment URL into FrontendArena.

## Submission description
SpendWise is a responsive 30-day finance simulator for a fixed ₹10,000 budget. Users can log expenses, manage upcoming commitments and savings goals, and test purchases, emergencies, subscription cancellations, or extra income before applying them. The dashboard recalculates available balance, daily allowance, month-end forecast, financial health, risk, and category spending. Data is stored locally in the browser; no real bank account is connected.

## Notes
- This is a demo, not financial advice or a banking service.
- State is local to the current browser/device.
- The challenge day is a demo setting and does not advance automatically.
