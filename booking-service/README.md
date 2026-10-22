# Booking Central booking service

Booking requests, customer accounts and an administrator dashboard for [Booking Central](https://lgdjoe.github.io/booking-central/).

- [Request a session](https://booking-central-bookings.legendaryjoe.chatgpt.site/book)
- [My bookings](https://booking-central-bookings.legendaryjoe.chatgpt.site/bookings)
- [Administrator dashboard](https://booking-central-bookings.legendaryjoe.chatgpt.site/admin)

## Booking flow

Customers sign in with ChatGPT, choose a venue, facility, date, time and duration, and submit their contact details. Each request is saved to the hosted database with a unique reference and a **pending approval** status. Customers can view and cancel their own requests.

The administrator checks availability with the venue, assigns a court and approves or declines the request. Confirmed sessions on the same venue, court and date cannot overlap. Availability is not synchronized with venue calendars. Payments are arranged with the venue; automatic email notifications are not enabled. Customers check My Bookings for updates.

## Development

Requires Node.js 24 or later.

```sh
npm ci
npm test
npm run build
```

The Worker entry point is `src/index.js`; the build produces `dist/server/index.js`. The tests apply the real SQL migrations to SQLite and cover persistence, retries, ownership, administrator access, booking conflicts, validation and API authorization. They use synthetic records in memory and do not create production bookings.

## Hosting and data

The directory is hosted on GitHub Pages. This service runs on Sites with a durable D1 database bound as `DB`; GitHub Pages cannot execute its server or store bookings. `.openai/hosting.json` identifies the existing Sites project. The venue catalog is a snapshot of the directory.

Sites provides sign-in and trusted identity headers. Do not expose this Worker through a proxy that permits clients to supply identity headers. The first authenticated account matching the server-side `ADMIN_EMAIL` secret claims administrator access; subsequent authorization uses the stored stable user ID. Credentials and booking records must remain outside this repository.

Database declarations live in `db/schema.js`; committed migrations and metadata live in `drizzle/`. Generate schema changes with `npm run db:generate`. Append migrations after a deployment instead of editing previously applied migrations.

## Deployment

Build and push the exact source commit to the project's Sites source repository. Package `.openai/hosting.json`, `dist/` and `drizzle/` at the archive root, save a Sites version for that commit, then deploy the saved version. Keep the existing project ID and database binding. GitHub checks validate the source; a GitHub push alone does not deploy this service.

The deployed service has been checked for health, anonymous-access rejection and rejection of forged identity headers. A simulated DOM flow against the bundled Worker and real local SQLite covers request submission, administrator approval, customer refresh and cancellation. Interactive browser and authenticated production-session testing remain separate checks.
