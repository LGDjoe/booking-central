# Booking Central

A responsive sports venue directory with a red identity (`#DC2626`), local venue photography, search by sport and location, venue details, galleries, and a connected booking service.

Built using REA (Reverse Engineering Anything) to study the public layout and interaction patterns of https://playsportstogether.com. The new identity, promotional panels, directory policies, and booking flow belong to this rebuild.

## Run locally

Requires Node.js 22 or later. No application dependencies are needed.

```sh
npm run dev
```

Open http://localhost:4173. Run `npm run check` to check JavaScript syntax.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes changes to `main` automatically. In the repository's **Settings → Pages**, the source must be **GitHub Actions**.

`npm run build:pages` creates the deployable site in `_pages/`, using `/booking-central` as its default base. For a custom domain, run `node build-pages.mjs ''`. The builder supports the home page, venue URLs, policy pages, and a 404 fallback. The `dist/` directory remains suitable for hosting at a domain root.

## Booking service source

The `booking-service/` directory contains the booking server, customer and administrator screens, database migrations and tests. See [its README](booking-service/README.md) for development and hosting details. This repository holds both parts of Booking Central; the directory deploys to GitHub Pages and the booking service runs on Sites.

## Content and behavior

- 278 venue listings with sport and city filters, suggestions, pagination, and empty states.
- Venue galleries, amenities, prices, hours, layouts, and map links.
- Booking buttons open the [booking service](https://booking-central-bookings.legendaryjoe.chatgpt.site/book), retaining the selected venue, date, time and duration.
- Customers sign in with ChatGPT, submit a request, receive a reference, and view or cancel it in [My bookings](https://booking-central-bookings.legendaryjoe.chatgpt.site/bookings).
- The [administrator dashboard](https://booking-central-bookings.legendaryjoe.chatgpt.site/admin) lets the owner approve, decline or cancel requests. Approval requires checking availability with the venue and assigning a court.
- Requests remain pending until approved. Payments are arranged with the venue; automatic emails and live venue availability feeds are not enabled.
- Venue information is a directory snapshot, not a live inventory feed. Confirm current details with the venue.
- The booking service runs separately on Sites with a hosted database. GitHub Pages serves this directory.
- No original analytics, accounts, or tracking code is included.

## Verification

REA analyzed two publicly shipped JavaScript chunks and matching source maps with zero parse failures. `docs/rea-findings.json` records the static evidence and its limitations.

Syntax, data integrity, route entry points, asset references, and simulated DOM interaction checks cover both domain-root hosting and GitHub project Pages. Browser visual verification was unavailable in the build environment.
