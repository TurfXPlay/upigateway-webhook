async function createOrder({ name, mobile, amount, venue }) {
  const client_txn_id =
    "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

const baseUrl = process.env.BASE_URL;

const payload = {
  key: process.env.UPIGATEWAY_KEY,
  client_txn_id,
  amount: amount.toString(),
  p_info: "TurfX Community Payment",
  customer_name: name,
  customer_mobile: mobile,
  customer_email: `${mobile}@turfxtemp.com`,
  udf1: name,
  udf2: venue || "",
  redirect_url: `${baseUrl}/payment-success.html`
};


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

  if (!data.status || !data.data?.payment_url) {
    throw new Error("UPIGateway order creation failed");
  }

  return data.data.payment_url;
}

module.exports = { createOrder };
