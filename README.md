# Wearables Studio

Premium custom apparel platform built with Next.js for:
- a design editor
- creator marketplace
- in-store payment-only ordering
- cashier/admin dashboard
- QR-based order retrieval

## Demo accounts
- Admin: `admin@wearables.studio` / `Admin123!`
- Creator: `nour@wearables.studio` / `Creator123!`
- Customer: `customer@example.com` / `Customer123!`

## Run locally
```bash
npm install
npm run dev
```

## Key business rule
Online payments are intentionally **not implemented**. Orders are created as `Pending Payment` and must be paid physically in store, where an admin confirms payment manually.
