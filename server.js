/**
 * server.js
 * Clean baseline with:
 * - /pay → serves pay.html
 * - /create-payment → calls UPIGateway
 * - minimal validation
 * - ready for localhost + Render
 */

const express = require("express");
const path = require("path");

const app = express();

/* =========================
   Middleware
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Health Check (optional)
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

  // Basic validation (keep minimal for now)
  if (!name || !mobile || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // Generate unique transaction ID
  const client_txn_id =
    "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

  const payload = {
    key: process.env.UPIGATEWAY_KEY, // set in env
    client_txn_id: client_txn_id,
    amount: numericAmount.toString(),
    p_info: "TurfX Community Payment",
    customer_name: name,
    customer_mobile: mobile,
    redirect_url: "http://localhost:3000/pay" // change to prod URL later
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
      return res.json({
        payment_url: data.data.payment_url
      });
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
   Start Server
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/pay`);
});
