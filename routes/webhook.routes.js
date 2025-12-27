const express = require("express");
const router = express.Router();

// In-memory store to prevent duplicate processing (TEMP)
const processedTxns = new Set();

/* =========================
   UPIGateway Webhook
========================= */
router.post("/api/upigateway/webhook", (req, res) => {
  console.log("====================================");
  console.log("🔔 WEBHOOK HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("====================================");

  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("ℹ️ Empty webhook body (ping / verification)");
    return res.status(200).send("OK");
  }

  const { client_txn_id, status, upi_txn_id, amount } = req.body;

  if (!client_txn_id || !status) {
    console.log("⚠️ Invalid webhook payload");
    return res.status(200).send("OK");
  }

  if (processedTxns.has(client_txn_id)) {
    console.log("🔁 Duplicate webhook ignored:", client_txn_id);
    return res.status(200).send("OK");
  }

  if (status === "success") {
    console.log("✅ PAYMENT SUCCESS");
    console.log({ client_txn_id, upi_txn_id, amount });
    processedTxns.add(client_txn_id);
  } else {
    console.log("❌ PAYMENT NOT SUCCESSFUL:", status);
  }

  res.status(200).send("OK");
});

module.exports = router;
