const { google } = require("googleapis");

/**
 * Initialize Google Sheets client (AUTH FIXED)
 */
async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  }
  if (!process.env.SHEET_ID) {
    throw new Error("SHEET_ID not set");
  }

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  // 🔑 THIS IS THE CRITICAL PART
  await auth.authorize();

  return google.sheets({ version: "v4", auth });
}

/**
 * Get today's tab name YYYY-MM-DD
 */
function getTodayTabName() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ensure sheet/tab exists
 */
async function ensureSheetExists(sheets, sheetId, title) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId
  });

  const exists = spreadsheet.data.sheets.some(
    s => s.properties.title === title
  );

  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title }
          }
        }
      ]
    }
  });
}

/**
 * Write webhook payload to Google Sheet
 */
async function writePaymentToSheet(payload) {
  const sheets = await getSheetsClient();
  const sheetId = process.env.SHEET_ID;
  const tabName = getTodayTabName();

  await ensureSheetExists(sheets, sheetId, tabName);

  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:ZZ`
  });

  const rows = readRes.data.values || [];
  const headers = rows[0] || [];

  // Deduplicate by upi_txn_id
  const upiIndex = headers.indexOf("upi_txn_id");
  if (upiIndex !== -1) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][upiIndex] === payload.upi_txn_id) {
        console.log("🟡 Duplicate upi_txn_id, skipping:", payload.upi_txn_id);
        return;
      }
    }
  }

  const payloadKeys = Object.keys(payload);
  const finalHeaders = [...headers];

  payloadKeys.forEach(key => {
    if (!finalHeaders.includes(key)) {
      finalHeaders.push(key);
    }
  });

  // Update headers if changed
  if (finalHeaders.length !== headers.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [finalHeaders] }
    });
  }

  const row = finalHeaders.map(h => payload[h] ?? "");

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });

  console.log("✅ Written payment to Google Sheet:", payload.upi_txn_id);
}

module.exports = { writePaymentToSheet };
