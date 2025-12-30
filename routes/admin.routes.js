const express = require("express");
const router = express.Router();
const { google } = require("googleapis");

/**
 * Helper: get today's date in IST (YYYY-MM-DD)
 */
function getTodayIST() {
  const now = new Date();
  const istDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return istDate.toISOString().split("T")[0];
}

/**
 * Route:
 * /admin/payments           → today (IST)
 * /admin/payments/:date     → specific date
 */
router.get("/admin/payments/:date?", async (req, res) => {
  const date = req.params.date || getTodayIST();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).send("Invalid date format. Use YYYY-MM-DD");
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${date}!A1:ZZ`
    });

    const rows = readRes.data.values || [];

    if (rows.length <= 1) {
      return res.send(renderNoData(date));
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const idx = name => headers.indexOf(name);

    const idxCreatedAt = idx("createdAt");
    const idxUserName = idx("udf1");
    const idxUpiName = idx("customer_name");
    const idxAmount = idx("amount");
    const idxMobile = idx("customer_mobile");
    const idxTxnId = idx("client_txn_id");

    let totalAmount = 0;

    // Build + SORT rows (latest first)
    const tableRows = dataRows
      .map(row => {
        const createdAt = row[idxCreatedAt]
          ? new Date(row[idxCreatedAt])
          : null;

        const amount = Number(row[idxAmount] || 0);
        totalAmount += amount;

        const timeIST = createdAt
          ? createdAt.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Kolkata"
            })
          : "";

        return {
          createdAt,
          time: timeIST,
          userName: row[idxUserName] || row[idxUpiName] || "",
          upiName: row[idxUpiName] || "",
          amount,
          mobile: row[idxMobile] || "",
          txnId: row[idxTxnId] || ""
        };
      })
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt - a.createdAt; // newest first
      });

    res.send(
      renderTable({
        date,
        rows: tableRows,
        totalAmount,
        totalTransactions: tableRows.length
      })
    );
  } catch (err) {
    console.error("Admin payments error:", err);
    res.status(500).send("Failed to load payments");
  }
});

/* =========================
   HTML render helpers
========================= */

function renderNoData(date) {
  return `
  <html>
    <head>
      <title>Payments — ${date}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="font-family: Arial; padding: 16px;">
      <h2>Payments — ${date}</h2>
      <p>No payments found for this date.</p>
    </body>
  </html>
  `;
}

function renderTable({ date, rows, totalAmount, totalTransactions }) {
  return `
  <html>
    <head>
      <title>Payments — ${date}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: Arial; padding: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
        th { background: #f2f2f2; }
      </style>
    </head>
    <body>

      <h2>Payments — ${date}</h2>
      <div>Total transactions: ${totalTransactions}</div>

      <table>
        <thead>
          <tr>
            <th>Time (IST)</th>
            <th>User Name</th>
            <th>Amount (₹)</th>
            <th>Mobile</th>
            <th>Transaction ID</th>
            <th>UPI Name</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.time}</td>
              <td>${r.userName}</td>
              <td style="text-align:right;">₹${r.amount}</td>
              <td>${r.mobile}</td>
              <td>${r.txnId}</td>
              <td>${r.upiName}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <h3>TOTAL AMOUNT: ₹${totalAmount}</h3>

    </body>
  </html>
  `;
}

module.exports = router;
