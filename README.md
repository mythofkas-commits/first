# Vida Beauty Brow Site

This project powers the Vida Beauty Brow marketing and booking experience. The site is served by an Express backend that exposes a JSON configuration, renders custom pages, and hosts a full admin panel for editing content, services, imagery, and design without touching code.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) set an admin token to secure write access. Create a `.env` file or export the variable before starting the server:

   ```bash
   export ADMIN_TOKEN="choose-a-strong-token"
   ```

   If no token is supplied the server falls back to `changeme`.

3. Start the development server:

   ```bash
   npm start
   ```

4. Visit the site at [http://localhost:3000](http://localhost:3000). The admin panel is available at [http://localhost:3000/admin](http://localhost:3000/admin).

## Admin panel overview

The admin dashboard provides two editing experiences:

- **Structured controls** for common fields including the brand identity, homepage hero copy, service highlights, booking hero, checkout messaging, and full service menu.
- **Advanced JSON editor** for direct control over every key in `data/site.json`, covering navigation, pages, images, design tokens, testimonials, and more.

Changes are persisted by calling `PUT /api/site` and instantly reflected on the public site. All write operations require the admin token via the `x-admin-token` header (or Authorization bearer token).

### What you can customize

- Global brand info, navigation, footer copy, and social links
- Theme colors, gradients, fonts, custom CSS, and imagery
- Homepage hero, badges, services, results gallery, testimonials, CTA, and contact details
- Booking page hero, filters, service menu structure, checkout messaging, and thank-you copy
- Additional custom pages served from `/pages/<slug>` with support for HTML sections, lists, and rich content

## API endpoints

- `GET /api/site` – returns the entire site configuration JSON
- `PUT /api/site` – replaces the configuration (requires admin token)
- `PATCH /api/site` – merges updates into the existing configuration (requires admin token)
- `GET /pages/:slug` – renders a fully themed page defined in the `pages` array

## Data structure

The canonical configuration lives in `data/site.json`. It is organized by feature area:

- `site`: brand details, meta tags, navigation, and social links
- `design`: colors, fonts, gradients, shadows, and optional custom CSS
- `homepage`: hero, badges, services, experience highlights, results gallery, reviews, CTA, and contact block
- `orderPage`: booking hero, filter list, service menu groups, checkout messaging, and footer note
- `pages`: array of custom pages rendered by the backend

Updating the JSON via the admin panel or directly editing the file will drive the content that renders on both the marketing and booking pages.

## Development notes

- Static assets are served from the project root via Express. Any request that doesn’t match an API route or custom page falls back to `index.html`.
- The frontend reads live content by calling `/api/site` (`scripts/content.js` handles hydration). When the API is unreachable the site falls back to bundled defaults.
- The booking experience (`order.html`) renders its menu dynamically from the service menu data, while preserving search, filter, sort, and cart behavior.

## Deployment

Deploy the project by running the Node server in your preferred environment (e.g., PM2, Docker, Railway). Make sure `data/site.json` is writable so the admin panel can persist updates. Protect the admin token via environment variables or secrets management.
