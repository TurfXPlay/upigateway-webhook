const express = require("express");
const router = express.Router();
const { writePaymentToSheet } = require("../services/sheets.service");

// In-memory duplicate guard (runtime only)
const processedTxns = new Set();

router.post("/api/upigateway/webhook", async (req, res) => {
  console.log("====================================");
  console.log("🔔 WEBHOOK HIT");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("====================================");

  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("ℹ️ Empty webhook body");
    return res.status(200).send("OK");
  }

  const { client_txn_id, status, upi_txn_id } = req.body;

  if (!client_txn_id || !status || !upi_txn_id) {
    console.log("⚠️ Invalid webhook payload");
    return res.status(200).send("OK");
  }

  if (processedTxns.has(upi_txn_id)) {
    console.log("🔁 Duplicate webhook ignored:", upi_txn_id);
    return res.status(200).send("OK");
  }

  if (status === "success") {
    try {
      await writePaymentToSheet(req.body);
      processedTxns.add(upi_txn_id);
    } catch (err) {
      console.error("❌ Failed to write to Google Sheet:", err);
    }
  } else {
    console.log("❌ Payment not successful:", status);
  }

  res.status(200).send("OK");
});

module.exports = router;
