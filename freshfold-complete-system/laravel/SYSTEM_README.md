# FreshFold — Full System Build Notes

This covers all 5 stages built across this conversation: Laravel backend
(auth, customer, rider, admin APIs, and the payment webhook) plus the
rewired HTML/CSS/JS frontend for all 18 pages.

## Setting up the backend

1. `composer create-project laravel/laravel freshfold-backend` (if not already started)
2. Copy every file from this `laravel/` folder into your project, preserving paths
   (e.g. `app/Models/Order.php` → your project's `app/Models/Order.php`)
3. `php artisan install:api` — installs Sanctum
4. Add the contents of `.env.example.additions` to your real `.env`
5. Add the `payment_gateway` block from `config/services.php` into your
   project's existing `config/services.php` (don't overwrite the whole file —
   it already has other providers configured)
6. Run migrations: `php artisan migrate`
7. Seed at least the 4 services from the Book a Service page (Wash/Dry/Fold,
   Wash & Dry Only, Dry Cleaning, Ironing Only) so `service_id` 1–4 match
   what `book.js` sends — a seeder isn't included, add one via
   `php artisan make:seeder ServiceSeeder`
8. `php artisan queue:table && php artisan migrate` — creates the jobs table
   for `SendOrderNotification`
9. Start the app: `php artisan serve` (API) + `php artisan queue:work` (notifications)

## Setting up the frontend

All HTML/CSS/JS files sit flat in one folder (no build step). Open
`index.html` to start from login, or serve the folder with any static
server (e.g. VS Code's Live Server) since `fetch()` calls need a proper
origin, not a `file://` URL.

Every page expects the API at `http://localhost:8000/api` — change
`API_BASE` in `api.js` and the inline constant in `script.js` if your API
runs elsewhere.

## Payment flow (PayMongo)

1. Customer submits the Book a Service form → `POST /bookings` creates the
   order with `status: pending`, no payment yet
2. Frontend immediately calls `POST /orders/{code}/pay` → `PaymentController`
   creates a real PayMongo **Checkout Session** (GCash/card/Maya), with
   `reference_number` set to the order code so the webhook can match it back
3. Customer is redirected to PayMongo's hosted checkout page
   (`checkout_url` from the API response)
4. After paying, PayMongo redirects the browser to `success_url` (Order
   Tracking) or `cancel_url` (back to Book a Service) — these are just UX,
   the REAL confirmation is step 5
5. PayMongo calls your webhook — `POST /webhooks/paymongo` — server to
   server. `VerifyWebhookSignature` checks the `Paymongo-Signature` header
   (HMAC-SHA256 over `{timestamp}.{raw body}`, using your webhook's signing
   secret, NOT your API secret key) before anything else runs
6. `WebhookController::paymongo()` marks the `Payment` row paid, moves the
   order to `confirmed`, and queues a `SendOrderNotification` job

**To actually test this locally**, PayMongo needs a public URL to call —
use `ngrok http 8000` (or similar) and register
`https://<your-ngrok-id>.ngrok.io/api/webhooks/paymongo` as the webhook URL
in the PayMongo Dashboard (Developers > Webhooks), subscribed to the
`checkout_session.payment.paid` event.

## What's real vs. what's still a stub

- **Real**: auth, bookings, the full PayMongo checkout + webhook flow, order
  tracking, rider task management, all 9 admin pages, queued notifications
  with retry/backoff, integration logging for nearly every action.
- **Stub**: `SendOrderNotification::sendViaProvider()` doesn't call an actual
  SMS/email provider yet — wire in Semaphore, Twilio, or similar.
- **Not built**: a detail page for Order Management's "View" button, an "Add
  team member" form, seeders/factories for demo data, refund handling.

## Stage map (for reference)

| Stage | Covers |
|---|---|
| 1 | Models, Sanctum auth, role middleware |
| 2 | Customer booking/orders/notifications |
| 3 | Rider tasks, status updates, task history |
| 4 | Admin: orders, assignment, customers, staff, services, payments, logs, reports |
| 5 | Payment webhook + queued notification jobs |
