const express = require("express");
const path = require("path");

const paymentRoutes = require("./routes/payment.routes");
const webhookRoutes = require("./routes/webhook.routes");

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
   Static / Pay Page
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   Routes
========================= */
app.use("/", paymentRoutes);
app.use("/", webhookRoutes);

const adminRoutes = require("./routes/admin.routes");
app.use(adminRoutes);


/* =========================
   Start Server
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
