const express = require("express");
const path = require("path");

const app = express();

/**
 * IMPORTANT:
 * UPIGateway may send:
 * - application/json
 * - application/x-www-form-urlencoded
 * - empty body (ping)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Health Check
========================= */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================
   Serve Pay Page
========================= */
app.get("/pay", (req, res) => {
  res
    .status(200)
    .type("html")
    .sendFile(path.join(__dirname, "public", "pay.html"));
});

/* =========================
   Create Payment (UPIGateway)
========================= */
app.post("/create-payment", async (req, res) => {
  const { name, mobile, amount } = req.body;

  if (!name || !mobile || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const client_txn_id =
    "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

  const payload = {
    key: process.env.UPIGATEWAY_KEY,
    client_txn_id,
    amount: numericAmount.toString(),
    p_info: "TurfX Community Payment",
    customer_name: name,
    customer_mobile: mobile,
    customer_email: `${mobile}@turfxtemp.com`,
    redirect_url: "https://upigateway-webhook.onrender.com/pay"
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
    console.log("UPIGateway response:", data);

    if (data.status && data.data && data.data.payment_url) {
      return res.json({ payment_url: data.data.payment_url });
    }

    return res.status(500).json({
      error: "Failed to create payment order",
      details: data
    });

  } catch (err) {
    console.error("UPIGateway error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   UPIGateway Webhook
   (COPIED FROM WORKING COMMIT)
========================= */

// In-memory store to prevent duplicate processing (TEMP)
const processedTxns = new Set();

app.post("/api/upigateway/webhook", (req, res) => {
  console.log("====================================");
  console.log("🔔 WEBHOOK HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("====================================");

  // Handle empty ping / verification call
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("ℹ️ Empty webhook body (ping / verification)");
    return res.status(200).send("OK");
  }

  const {
    client_txn_id,
    status,
    upi_txn_id,
    amount
  } = req.body;

  // Basic validation
  if (!client_txn_id || !status) {
    console.log("⚠️ Invalid webhook payload");
    return res.status(200).send("OK");
  }

  // Prevent duplicate processing
  if (processedTxns.has(client_txn_id)) {
    console.log("🔁 Duplicate webhook ignored:", client_txn_id);
    return res.status(200).send("OK");
  }

  // Process payment result
  if (status === "success") {
    console.log("✅ PAYMENT SUCCESS");
    console.log({
      client_txn_id,
      upi_txn_id,
      amount
    });

    // Mark as processed
    processedTxns.add(client_txn_id);

    /**
     * TODO (later):
     * - Verify amount with DB
     * - Update booking/payment record
     * - Lock slot
     */
  } else {
    console.log("❌ PAYMENT NOT SUCCESSFUL");
    console.log("Status:", status);
  }

  // MUST return 200
  res.status(200).send("OK");
});

/* =========================
   Start Server (Render-safe)
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
