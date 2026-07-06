require('dotenv').config();// server.js
// Minimal backend for creating Stripe Checkout Sessions.
//
// SECURITY: The secret key is NEVER written into this file, and never sent to
// the browser. It is read from an environment variable at runtime. Set it on
// whatever platform you deploy this to (Vercel/Render/Railway/etc), e.g.:
//
//   STRIPE_SECRET_KEY=sk_live_...   <-- set this in your host's dashboard,
//                                       not in this file, not in git.
//
// Deploy this file separately from the static site. The static site (index.html)
// only ever talks to the /create-checkout-session endpoint below — it never
// sees the secret key.

const express = require('express');
const cors = require('cors');

// Reads the key from the environment. Will be undefined until you set it on
// your hosting provider — that's intentional, so nothing sensitive ever sits
// in this repo.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Where your frontend (index.html) is served from. req.headers.origin isn't
// reliable here (it's missing/invalid if index.html is opened as a local
// file rather than through a real server), so set this explicitly.
// - While testing locally with Live Server, this is usually http://127.0.0.1:5500
//   or http://localhost:5500 (check the URL bar when Live Server opens the page).
// - Once deployed for real, change this to your live site's URL, e.g.
//   https://yourdomain.com
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500';

// Maps the bundle options shown on the page to a price in cents.
// Replace these with real Stripe Price IDs from your Dashboard for
// production use (Products > add product > copy the price ID, price_...),
// which is more robust than hard-coding amounts here.
const BUNDLES = {
  single: { name: 'Smart UV Sterilizer & Dispenser (1x)', amount: 7900 },
  bogo: { name: 'Smart UV Sterilizer & Dispenser (Buy 1 Get 1 Free)', amount: 7900 },
  buy2get2: { name: 'Smart UV Sterilizer & Dispenser (Buy 2 Get 2 Free)', amount: 15800 },
  buy3get3: { name: 'Smart UV Sterilizer & Dispenser (Buy 3 Get 3 Free)', amount: 23700 },
};

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { bundle = 'single', color = 'White' } = req.body || {};
    const selected = BUNDLES[bundle] || BUNDLES.single;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${selected.name} — ${color}`,
            },
            unit_amount: selected.amount,
          },
          quantity: 1,
        },
      ],
      // Collects a shipping address at checkout. List the countries you
      // actually ship to — Stripe will only let the customer pick from these.
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      // Optional but handy for delivery questions/fraud checks.
      phone_number_collection: {
        enabled: true,
      },
      success_url: `${FRONTEND_ORIGIN}/success.html`,
      cancel_url: `${FRONTEND_ORIGIN}/index.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));