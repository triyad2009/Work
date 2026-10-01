# WORK — Income Platform

A full-stack-ready task earning platform for the `triyad2009/Work` repository.

## Included MVP
- Fast email + password registration with name and phone metadata
- Member dashboard and wallet balance
- Admin-created earning tasks
- Proof/image upload to Supabase Storage
- Admin approval workflow
- Approved rewards automatically credited to wallet
- Configurable minimum withdrawal
- Withdrawal requests with bKash/Nagad/Rocket/Bank methods
- Admin approval workflow for withdrawals
- Row Level Security and server-side approval RPCs

## Run locally
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create a `.env` file from `.env.example`.
4. Add your Supabase URL and anon key.
5. Run `npm install`.
6. Run `npm run dev`.

## Make yourself admin
After registering, run this in Supabase SQL Editor using your account email:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL');
```

## Important
Only the Supabase anon key belongs in the browser. Never put a service-role key in frontend code.

Next upgrades can add payout ledger, task limits per user, referral system, fraud checks, notifications, admin settings, phone OTP, and payment gateway integration.