
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.client_url || "http://localhost:5173",
  })
);

app.use(express.json());

// Stripe setup
if (!process.env.Stripe_key) {
  throw new Error("Stripe_key is missing from .env file");
}

const stripe = new Stripe(process.env.Stripe_key);

// Dummy product catalog
// Product prices are controlled by the backend.
const products = {
  1: {
    name: "Wireless Headphones",
    price: 49.99,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  },
  2: {
    name: "Smart Watch",
    price: 79.99,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  },
  3: {
    name: "Premium Sneakers",
    price: 59.99,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  },
  4: {
    name: "Modern Backpack",
    price: 39.99,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
  },
};

// Home route
app.get("/", (req, res) => {
  res.send("Stripe Backend is Running!");
});

// Test Stripe connection
app.get("/test-stripe", async (req, res) => {
  try {
    const account = await stripe.accounts.retrieve();

    res.json({
      success: true,
      message: "Stripe connected successfully!",
      accountId: account.id,
    });
  } catch (error) {
    console.error("Stripe connection failed:", error.message);

    res.status(500).json({
      success: false,
      error: "Stripe connection failed",
    });
  }
});

// Create checkout session
app.post("/checkout-session", async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Your cart is empty or invalid",
      });
    }

    const line_items = cart.map((item) => {
      const product = products[item.id];
      const quantity = Number(item.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        throw new Error("Invalid product or quantity");
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity,
      };
    });

    const clientUrl =
      process.env.client_url || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cancel`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error.message);

    res.status(400).json({
      success: false,
      error: error.message || "Unable to create checkout session",
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Stripe backend running on http://localhost:${PORT}`);
});

module.exports = app;
