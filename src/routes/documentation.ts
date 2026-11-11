import express from "express";

const router = express.Router();

// The API documentation, served as plain text at GET /documentation (the route is at the bottom of this file).
// Update it whenever an endpoint, a payload or a validation rule changes.
// The text sits inside a template literal, so it must not contain backticks, backslashes or "${".
const documentation = `# Stare API

The API behind the Stare merch store. It manages products, their variants (size and
stock) and orders.

Paths are relative to the server's address, for example http://localhost:8080/products.


## Basics

Requests and responses are JSON. Two headers matter:

    Content-Type: application/json    on every request that has a body
    x-api-key: YOUR_API_KEY           on every endpoint marked "API key: yes"

- Without the Content-Type header the server ignores the body.
- Without a valid key the server answers 401 "Missing or invalid API key".
- Prices are in whole cents: 2500 means $25.00.
- Integers must be JSON numbers (2500), not strings ("2500").
- price_cents and inventory_count can be at most 2147483647.
- Strings must not be empty or only spaces.
- Errors are a plain-text message with a 4xx or 5xx status code, except where noted.
  An unexpected failure answers 500 "Error occured on the server".


## Endpoints

    CRUD     Method   Path                       API key   What it does

    Create   POST     /products                  yes       Create a product
    Read     GET      /products                  no        List every product with its variants
    Update   PATCH    /products/:id              yes       Change a product
    Delete   DELETE   /products/:id              yes       Delete a product and its variants

    Create   POST     /product_variants          yes       Add a variant to a product
    Update   PATCH    /product_variants/:sku     yes       Change a variant

    Create   POST     /create-checkout-session   no        Start a checkout (creates an order)
    Read     GET      /orders                    yes       List every order with its items
    Update   PATCH    /orders/:id                yes       Change an order's status


## Data structure

A product has many variants. A variant is one size of a product, with its own SKU and stock.
An order has many items. An item is a copy of one variant's details at the time of purchase.

    Product
      id                   integer          set by the server
      name                 string           max 255 characters
      description          string           max 255 characters
      image_url            string           max 255 characters
      price_cents          integer          1 or more
      variants             array            the product's variants

    Variant
      id                   integer          set by the server
      product_id           integer          the product it belongs to
      size                 string           max 20 characters, unique within its product
      sku                  string           max 255 characters, unique across all variants
      inventory_count      integer          units in stock, 0 or more
      price_id             string           the Stripe Price ID charged at checkout

    Order
      id                   integer          set by the server
      status               string           one of the order statuses below
      total_cents          integer          the sum of its items' line_total_cents
      email                string or null   the customer's email, null until the order is paid
      shipping_address     object or null   the delivery address, null until the order is paid
      stripe_session_id    string           the Stripe Checkout Session ID
      created_at           string           ISO 8601 date and time
      updated_at           string           ISO 8601 date and time
      items                array            the order's items

    Order item
      id                   integer          set by the server
      product_variant_id   integer          the variant that was bought
      product_name         string           the product's name at the time of purchase
      variant_size         string           the variant's size at the time of purchase
      product_sku          string           the variant's SKU at the time of purchase
      unit_price_cents     integer          the product's price_cents at the time of purchase
      quantity             integer          1 or more
      line_total_cents     integer          unit_price_cents x quantity

Order statuses:

    payment_pending      set by the server when a checkout starts
    payment_cancelled    set by the server when a checkout expires unpaid
    paid                 set by the server when the payment is confirmed
    fulfilled            set by you with PATCH /orders/:id
    refund_requested     set by you with PATCH /orders/:id
    refunded             set by you with PATCH /orders/:id

A product's price_cents is the price the store shows and the price recorded on orders.
The amount the customer is charged is the Stripe Price in each variant's price_id, so the
two must match.


## Products

### Create: POST /products

Creates a product. API key: yes.
A new product has no variants. Add them with POST /product_variants.

Body:

    Field         Type      Required   Rules
    name          string    yes        max 255 characters
    description   string    yes        max 255 characters
    image_url     string    yes        max 255 characters
    price_cents   integer   yes        1 or more

Example body:

    {
      "name": "Poster",
      "description": "A tour poster",
      "image_url": "https://example.com/poster.jpg",
      "price_cents": 1000
    }

Response 201, the new product:

    {
      "id": 4,
      "name": "Poster",
      "description": "A tour poster",
      "image_url": "https://example.com/poster.jpg",
      "price_cents": 1000
    }

Errors:

    400   a field is missing or invalid (the message lists every problem)

### Read: GET /products

Lists every product with its variants. API key: no. No body.

Response 200:

    [
      {
        "id": 1,
        "name": "Shirt",
        "price_cents": 2500,
        "description": "A comfortable cotton t-shirt",
        "image_url": "https://example.com/shirt.jpg",
        "variants": [
          { "id": 1, "size": "S", "sku": "SKUS0001", "inventory_count": 30 },
          { "id": 2, "size": "M", "sku": "SKUM0001", "inventory_count": 30 }
        ]
      }
    ]

Variants in this list leave out product_id and price_id.
A product with no variants has an empty "variants" array.

### Update: PATCH /products/:id

Changes a product. API key: yes. :id is the product's id.
Send only the fields you want to change. At least one is required.

Body:

    Field         Type      Required   Rules
    name          string    no         max 255 characters
    description   string    no         max 255 characters
    image_url     string    no         max 255 characters
    price_cents   integer   no         1 or more

Example, PATCH /products/4:

    { "price_cents": 1200 }

Response 200, the updated product (without its variants):

    {
      "id": 4,
      "name": "Poster",
      "price_cents": 1200,
      "description": "A tour poster",
      "image_url": "https://example.com/poster.jpg"
    }

Errors:

    400   invalid id, invalid field, or no fields sent
    404   no product has that id

### Delete: DELETE /products/:id

Deletes a product and all of its variants. API key: yes. No body.

Response 204, with no body.

Errors:

    400   invalid id
    404   no product has that id
    409   one of its variants is in an existing order, so the product can't be deleted


## Product variants

Variants have no read or delete endpoint of their own. They are returned by GET /products
and deleted with their product.

### Create: POST /product_variants

Adds a variant to an existing product. API key: yes.

Body:

    Field             Type      Required   Rules
    product_id        integer   yes        the id of an existing product
    size              string    yes        max 20 characters, unique within the product
    sku               string    yes        max 255 characters, unique across all variants
    price_id          string    yes        the Stripe Price ID to charge at checkout
    inventory_count   integer   no         0 or more, defaults to 0

Example body:

    {
      "product_id": 4,
      "size": "None",
      "sku": "SKU00004",
      "price_id": "price_123",
      "inventory_count": 100
    }

Response 201, the new variant:

    {
      "id": 7,
      "product_id": 4,
      "size": "None",
      "sku": "SKU00004",
      "price_id": "price_123",
      "inventory_count": 100
    }

Errors:

    400   a field is missing or invalid (the message lists every problem)
    404   no product has that product_id
    409   the SKU is already taken, or the product already has that size

### Update: PATCH /product_variants/:sku

Changes a variant. API key: yes. :sku is the variant's current SKU.
Send only the fields you want to change. At least one is required.
product_id can't be changed.

Body:

    Field             Type      Required   Rules
    size              string    no         max 20 characters, unique within the product
    sku               string    no         the new SKU (same rules as when creating)
    price_id          string    no         the Stripe Price ID to charge at checkout
    inventory_count   integer   no         0 or more

Example, PATCH /product_variants/SKU00004:

    { "inventory_count": 80 }

Response 200, the updated variant:

    {
      "id": 7,
      "product_id": 4,
      "size": "None",
      "sku": "SKU00004",
      "inventory_count": 80,
      "price_id": "price_123"
    }

Errors:

    400   invalid field, or no fields sent
    404   no variant has that SKU
    409   the SKU is already taken, or the product already has that size


## Orders

Orders are created by a checkout, never directly. They can't be deleted.

### Create: POST /create-checkout-session

Starts a Stripe checkout for a cart and creates the order, with status payment_pending.
API key: no.

Body:

    Field              Type      Required   Rules
    items              array     yes        at least one item
    items[].sku        string    yes        the SKU of an existing variant
    items[].quantity   integer   yes        1 or more, and no more than the variant's stock

Prices are never sent. The server looks them up.

Example body:

    {
      "items": [
        { "sku": "SKUM0001", "quantity": 2 },
        { "sku": "SKU00002", "quantity": 1 }
      ]
    }

Response 200:

    { "url": "https://checkout.stripe.com/..." }

Send the customer to that URL to pay. It expires after 30 minutes. Stripe then reports
the result to POST /webhook, which you never call yourself:

- If the customer pays, the order becomes paid, its email and shipping_address are
  filled in, and each variant's inventory_count drops by the quantity bought.
- If the checkout expires unpaid, the order becomes payment_cancelled.

Errors, sent as JSON in the form { "error": "message" }:

    400   No items provided
    400   Each item must have a sku
    400   Invalid quantity for sku(s): ...
    400   Unknown sku(s): ...
    400   Insufficient inventory for sku(s): ...

### Read: GET /orders

Lists every order with its items, newest first. API key: yes. No body.

Response 200:

    [
      {
        "id": 12,
        "status": "paid",
        "total_cents": 5000,
        "email": "customer@example.com",
        "shipping_address": {
          "line1": "123 Main St",
          "line2": null,
          "city": "Toronto",
          "state": "ON",
          "postal_code": "M5V 2T6",
          "country": "CA"
        },
        "stripe_session_id": "cs_test_a1b2c3",
        "created_at": "2026-11-11T18:30:00.000Z",
        "updated_at": "2026-11-11T18:32:10.000Z",
        "items": [
          {
            "id": 20,
            "product_variant_id": 2,
            "product_name": "Shirt",
            "variant_size": "M",
            "product_sku": "SKUM0001",
            "unit_price_cents": 2500,
            "quantity": 2,
            "line_total_cents": 5000
          }
        ]
      }
    ]

### Update: PATCH /orders/:id

Changes an order's status. API key: yes. :id is the order's id.
status is the only field that can be changed.

Body:

    Field    Type     Required   Rules
    status   string   yes        payment_pending, payment_cancelled, paid, fulfilled,
                                 refund_requested or refunded

Example, PATCH /orders/12:

    { "status": "fulfilled" }

Response 200:

    { "id": 12, "status": "fulfilled" }

Errors:

    400   invalid id, or status is not one of the six values
    404   no order has that id
`;

router.route("/").get((req, res) => {
    res.type("text/plain").send(documentation);
});

export default router;
