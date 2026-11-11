# stare-server

The back end of the Stare project, an online merch store for the band Stare. It is an Express + TypeScript API backed by MySQL, with Stripe for checkout. The client side repo can be found at the link below:

https://github.com/maritzbuchholz/stare-client

## Quick Start

To set up node packages, run the command below:

```
npm install
```

Then create a `.env` file in the server root folder (see [Environment Variables](#environment-variables)), initialize the database, and start the API:

```
npm run database
npm run dev
```

## Best Practices & Development Tips

### Setting up the MySQL database

* To initialize the database, execute `npm run database` in the server root folder
* The script runs `src/utils/stare.sql` as the MySQL `root` user and will prompt you for your MySQL password
* It creates the `stare` database with the `products`, `product_variants`, `orders` and `order_items` tables

### Local Port & Client Side Connection

* Client side connects to the API through the port set in your server side `.env` file (`PORT`)
* The client's `VITE_API_BASE_URL` should point to that port, e.g. `http://localhost:8080`
* Make sure you start the API before your client side connects

### Environment Variables

Create a `.env` file in the server root folder with the following keys:

```
PORT=
DB_HOST=
DB_NAME=stare
DB_USER=
DB_PASSWORD=
STRIPE_KEY=
SECRET=
CONFIRM=
ADMIN_API_KEY=
```

* `PORT` – port the API listens on
* `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` – MySQL connection details
* `STRIPE_KEY` – Stripe secret key used to create checkout sessions
* `SECRET` – Stripe webhook signing secret
* `CONFIRM` – port the client runs on, used for the Stripe success redirect (e.g. `5173`)
* `ADMIN_API_KEY` – key required by the admin-only routes (creating, editing and deleting products, variants and orders). Send it in the `x-api-key` request header

## Common Scripts

* `npm run dev` starts the API and watches for changes to the code
* `npm run start` starts the API and DOES NOT watch for changes to the code (runs the compiled code in `dist`, so run `npm run build` first)
* `npm run lint` checks the code for style and formatting issues with ESLint (`npm run lint:fix` fixes what it can)
* `npm run database` initializes the `stare` database and its tables

## API Endpoints

The API serves its own documentation at `GET /documentation` (e.g. `http://localhost:8080/documentation`): payloads, required fields, responses and errors for every endpoint below.

| Method | Endpoint | Admin key required |
| ------ | -------- | ------------------ |
| GET | `/documentation` | No |
| GET | `/products` | No |
| POST | `/products` | Yes |
| PATCH | `/products/:id` | Yes |
| DELETE | `/products/:id` | Yes |
| POST | `/product_variants` | Yes |
| PATCH | `/product_variants/:sku` | Yes |
| GET | `/orders` | Yes |
| PATCH | `/orders/:id` | Yes |
| POST | `/create-checkout-session` | No |
| POST | `/webhook` | No (verified by Stripe signature) |

## Miscellaneous Items

* Use Postman or another API development platform to test the API
* `.env` should be included in `.gitignore` if pushed into production
* Make sure all packages are installed before running the server
* `npm run database` will reset the database in development (it drops and recreates `stare`)