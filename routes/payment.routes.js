const express = require("express");
const path = require("path");
const { createOrder } = require("../services/upigateway.service");

const router = express.Router();

/* =========================
   Serve Pay Page
========================= */
router.get("/pay", (req, res) => {
  res
    .status(200)
    .type("html")
    .sendFile(path.join(__dirname, "../public/pay.html"));
});

/* =========================
   Create Payment
========================= */
router.post("/create-payment", async (req, res) => {
  const { name, mobile, amount } = req.body;

  if (!name || !mobile || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const paymentUrl = await createOrder({
      name,
      mobile,
      amount: numericAmount
    });

    return res.json({ payment_url: paymentUrl });

  } catch (err) {
    console.error("Create payment failed:", err);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
});

module.exports = router;
