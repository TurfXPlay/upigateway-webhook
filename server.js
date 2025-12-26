const express = require("express");
const app = express();

app.use(express.json());

// Health check (important for uptime tools)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// UPIGateway webhook
app.post("/api/upigateway/webhook", (req, res) => {
  console.log("🔔 Webhook received:", req.body);

  const { client_txn_id, status, upi_txn_id, amount } = req.body;

  if (!client_txn_id || !status) {
    return res.status(400).send("Invalid payload");
  }

  if (status === "success") {
    console.log("✅ PAYMENT SUCCESS");
    console.log({ client_txn_id, upi_txn_id, amount });

    // TODO (later):
    // 1. Check if client_txn_id already processed (idempotency)
    // 2. Verify amount
    // 3. Mark booking PAID
  } else {
    console.log("❌ Payment not successful:", status);
  }

  // VERY IMPORTANT
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
