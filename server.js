/**
 * server.js
 * Final hardened version:
 * - User enters name, mobile, amount
 * - Guards for double-pay & invalid amounts
 * - UPIGateway webhook handling
 * - Render compatible
 */

const express = require("express");
const path = require("path");

const app = express();

/* =========================
   Middleware
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* =========================
   Health Check
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   Payment Page
========================= */
app.get("/pay", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pay.html"));
});

/* =========================
   Guards (in-memory)
========================= */

// Prevent double-click / duplicate order creation
const activePaymentRequests = new Set();

// Prevent duplicate webhook processing
const processedTxns = new Set();

/* =========================
   Create Payment Order
========================= */
app.post("/create-payment", async (req, res) => {
  const { name, mobile, amount } = req.body;

  /* ---- Basic validation ---- */
  if (!name || !mobile || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ error: "Invalid mobile number" });
  }

  const numericAmount = Number(amount);

  if (isNaN(numericAmount) || numericAmount < 10 || numericAmount > 50000) {
    return res.status(400).json({ error: "Amount out of allowed range" });
  }

  /* ---- Double-click guard ---- */
  const requestKey = `${mobile}_${numericAmount}`;
  if (activePaymentRequests.has(requestKey)) {
    return res.status(429).json({ error: "Duplicate payment request" });
  }

  activePaymentRequests.add(requestKey);

  // Auto-release lock after 5 seconds
  setTimeout(() => activePaymentRequests.delete(requestKey), 5000);

  /* ---- Generate transaction ID ---- */
  const client_txn_id =
    "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

  const payload = {
    key: process.env.UPIGATEWAY_KEY,
    client_txn_id,
    amount: numericAmount.toString(),
    p_info: "TurfX Community Payment",
    customer_name: name,
    customer_mobile: mobile,
    redirect_url: "https://upigateway-webhook.onrender.com/health"
  };

  try {
    const response = await fetch(
      "https://merchant.upigateway.com/api/create_order",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (data.status && data.data && data.data.payment_url) {
      return res.json({ payment_url: data.data.payment_url });
    }

    console.error("Create order failed:", data);
    return res.status(500).json({ error: "Order creation failed" });

  } catch (err) {
    console.error("Payment creation error:", err);
    return res.status(500).json({ error: "Payment creation error" });
  }
});

/* =========================
   UPIGateway Webhook
========================= */
app.post("/api/upigateway/webhook", (req, res) => {
  console.log("====================================");
  console.log("🔔 WEBHOOK HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("====================================");

  // Ping / verification hit
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("ℹ️ Empty webhook body (ping)");
    return res.status(200).send("OK");
  }

  const { client_txn_id, status, upi_txn_id, amount } = req.body;

  if (!client_txn_id || !status) {
    console.log("⚠️ Invalid webhook payload");
    return res.status(200).send("OK");
  }

  // Prevent duplicate webhook processing
  if (processedTxns.has(client_txn_id)) {
    console.log("🔁 Duplicate webhook ignored:", client_txn_id);
    return res.status(200).send("OK");
  }

  if (status === "success") {
    console.log("✅ PAYMENT SUCCESS");
    console.log({ client_txn_id, upi_txn_id, amount });

    processedTxns.add(client_txn_id);

    /**
     * NEXT STEPS (later):
     * - Save to DB
     * - Link to user/game
     * - Confirm slot
     */
  } else {
    console.log("❌ PAYMENT NOT SUCCESS:", status);
  }

  res.status(200).send("OK");
});

/* =========================
   Start Server
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
