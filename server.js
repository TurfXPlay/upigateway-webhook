const express = require("express");
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

// Health check (used by Render + UptimeRobot)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// In-memory store to prevent duplicate processing (TEMP)
// Later replace with DB
const processedTxns = new Set();

// UPIGateway Webhook Endpoint
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

// Render uses dynamic port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
