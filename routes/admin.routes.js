const express = require("express");
const router = express.Router();
const { google } = require("googleapis");

/**
 * GET /admin/payments/YYYY-MM-DD
 */
router.get("/admin/payments/:date", async (req, res) => {
  const date = req.params.date;

  // Basic date format validation
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

    // Read entire tab
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${date}!A1:ZZ`
    });

    const rows = readRes.data.values || [];

    if (rows.length <= 1) {
      return res.send(renderNoDataPage(date));
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map column indexes
    const colIndex = name => headers.indexOf(name);

    const idxCreatedAt = colIndex("createdAt");
    const idxName = colIndex("customer_name");
    const idxAmount = colIndex("amount");
    const idxMobile = colIndex("customer_mobile");
    const idxTxnId = colIndex("client_txn_id");

    let totalAmount = 0;

    const tableRows = dataRows.map(row => {
      const amount = Number(row[idxAmount] || 0);
      totalAmount += amount;

      const createdAtRaw = row[idxCreatedAt];
      const istTime = createdAtRaw
        ? new Date(createdAtRaw).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Kolkata"
          })
        : "";

      return {
        time: istTime,
        name: row[idxName] || "",
        amount,
        mobile: row[idxMobile] || "",
        txnId: row[idxTxnId] || ""
      };
    });

    return res.send(
      renderPaymentsPage({
        date,
        rows: tableRows,
        totalAmount,
        totalTransactions: tableRows.length
      })
    );

  } catch (err) {
    console.error("Admin payments view error:", err);
    return res.status(500).send("Failed to load payments");
  }
});

/* =========================
   HTML Render Helpers
========================= */

function renderNoDataPage(date) {
  return `
    <html>
      <head>
        <title>No Payments</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <h2>Payments — ${formatDate(date)}</h2>
        <p>No payments found for this date.</p>
      </body>
    </html>
  `;
}

function renderPaymentsPage({ date, rows, totalAmount, totalTransactions }) {
  const tableRowsHtml = rows
    .map(
      r => `
      <tr>
        <td>${r.time}</td>
        <td>${r.name}</td>
        <td style="text-align:right;">₹${r.amount}</td>
        <td>${r.mobile}</td>
        <td>${r.txnId}</td>
      </tr>
    `
    )
    .join("");

  return `
    <html>
      <head>
        <title>Payments — ${formatDate(date)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            font-size: 14px;
          }
          th {
            background: #f2f2f2;
            text-align: left;
          }
          .summary {
            margin-top: 16px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>

        <h2>Payments — ${formatDate(date)}</h2>
        <div>Total transactions: ${totalTransactions}</div>

        <table>
          <thead>
            <tr>
              <th>Time (IST)</th>
              <th>Name</th>
              <th>Amount (₹)</th>
              <th>Mobile</th>
              <th>Transaction ID</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="summary">
          TOTAL AMOUNT: ₹${totalAmount}
        </div>

      </body>
    </html>
  `;
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });
}

module.exports = router;
