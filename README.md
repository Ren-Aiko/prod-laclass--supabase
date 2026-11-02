# LaClassé Abaya

LaClassé Abaya is a premium modest-wear storefront and administration portal.

**Designed and developed by [REN Aiko](https://renaiko.com).**

## Features

- Product catalog with category, fabric, price, and availability filters
- Product details, size and length variants, cart, and checkout
- Customer reviews, order status, contact, and newsletter forms
- Admin portal for products, inventory, orders, coupons, reviews, subscribers, and messages
- Supabase PostgreSQL and Edge Functions for application data and APIs
- Cloudflare R2 for product images
- Cloudflare Worker and D1 integration retained for legacy/API workflows

## Technology

- React 19, TypeScript, and Vite
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, and Edge Functions)
- Cloudflare R2; Cloudflare Workers/D1 for legacy workflows
- Express and Node.js for the local application server

## Requirements

- Node.js 22 or later (the local server uses `node:sqlite`)
- npm
- Access to the configured Supabase project for live data and admin features

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set the values for your environment. At minimum, configure:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
   VITE_R2_PUBLIC_URL=https://your-public-r2-domain
   ```

   The frontend also supports setting the Supabase URL and publishable key in the Admin Portal settings. Use only a Supabase publishable/anon key in frontend configuration; **never put a service-role key or other secret in a `VITE_` variable**.

3. Start the local app:

   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The default port is `3000`; set `PORT` to use another port.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express server with the Vite development app |
| `npm start` | Start the app server |
| `npm run build` | Create the production frontend in `dist/` |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run the TypeScript check (`tsc --noEmit`) |

## Backend configuration

### Supabase

The app uses Supabase for its primary product, order, review, coupon, and customer data paths. Database SQL files are in [`supabase/`](./supabase); Edge Functions are in [`supabase/functions/`](./supabase).

Before deploying code that depends on a schema or RPC change:

1. Review the SQL file and apply the required SQL in the intended Supabase project's SQL Editor.
2. Deploy the corresponding Edge Function after the schema is ready.
3. Test the related storefront and admin workflows against that project.

Use the Supabase Dashboard or the Supabase CLI linked to the correct project to deploy functions, for example:

```sh
supabase functions deploy admin-products --project-ref YOUR_PROJECT_REF
```

Replace the function name as needed. Do not apply reset or seed scripts to a production database unless you have reviewed their effects and explicitly intend to reset or replace data. Back up production data before schema changes.

### Cloudflare R2

Product image uploads are handled by the `r2-images` Supabase Edge Function. Configure its secrets in Supabase Edge Function settings:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

The bucket needs to be configured for the intended public asset delivery method. Never commit R2 credentials.

### Cloudflare Worker/D1

The repository also includes `worker.js`, `schema.sql`, and `wrangler.jsonc` for legacy Worker/D1 workflows. Configure your own Cloudflare account, D1 database, and R2 bucket before using Wrangler. Replace template resource IDs and review Worker environment variables before deployment; never deploy placeholder or development credentials.

## Production build

```sh
npm run lint
npm run build
```

Deploy the generated `dist/` assets to your chosen static hosting provider, and deploy any required server/API and Supabase Edge Functions separately. Configure production environment variables in the hosting provider rather than committing a production `.env` file.

## Project structure

```text
src/
  components/       Shared layout, storefront, and admin UI
  context/          Store, cart, and admin state
  pages/            Storefront and admin pages
  services/         Supabase and application service clients
  types/            Application and database types
supabase/
  functions/        Supabase Edge Functions
  *.sql             Database schema, policies, and migrations
public/             Static assets, favicon, and loading logo
server.ts           Local Express/Vite server and D1 development setup
worker.js           Cloudflare Worker routes
schema.sql          Cloudflare D1 schema
```

## Credits

Website design and development: [REN Aiko](https://renaiko.com).
