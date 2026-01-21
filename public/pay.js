const STORAGE_KEY = "turfx_user";

const formSection = document.getElementById("formSection");
const confirmSection = document.getElementById("confirmSection");

const nameInput = document.getElementById("name");
const mobileInput = document.getElementById("mobile");
const venueInput = document.getElementById("venue");
const amountInput = document.getElementById("amount");

const cName = document.getElementById("cName");
const cMobile = document.getElementById("cMobile");
const cVenue = document.getElementById("cVenue");
const cAmount = document.getElementById("cAmount");

const nameError = document.getElementById("nameError");
const mobileError = document.getElementById("mobileError");
const amountError = document.getElementById("amountError");

const proceedBtn = document.getElementById("proceedBtn");
const cancelBtn = document.getElementById("cancelBtn");
const clearBtn = document.getElementById("clearBtn");
const form = document.getElementById("payForm");

/* Load instructions */
fetch("/instructions.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("instructionContainer").innerHTML = html;
  });

/* Restore user */
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  const u = JSON.parse(saved);
  nameInput.value = u.name || "";
  mobileInput.value = u.mobile || "";
  venueInput.value = u.venue || "";
}

/* Clear */
clearBtn.onclick = () => {
  localStorage.removeItem(STORAGE_KEY);
  nameInput.value = mobileInput.value = venueInput.value = amountInput.value = "";
};

/* Submit */
form.onsubmit = e => {
  e.preventDefault();
  nameError.textContent = mobileError.textContent = amountError.textContent = "";

  let name = nameInput.value.trim();
  let mobile = mobileInput.value.trim().replace(/^(\+91|0)/, "");
  let amount = parseFloat(amountInput.value);

  if (name.length < 3) return nameError.textContent = "Min 3 characters";
  if (!/^\d{10}$/.test(mobile)) return mobileError.textContent = "Invalid mobile";
  if (!amount || amount <= 0) return amountError.textContent = "Invalid amount";

  if (Number.isInteger(amount)) {
    amount += (Math.floor(Math.random() * 20) + 1) / 100;
  }

  cName.textContent = name;
  cMobile.textContent = mobile;
  cVenue.textContent = venueInput.value || "-";
  cAmount.textContent = amount.toFixed(2);

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, mobile, venue: venueInput.value }));

  proceedBtn.dataset.amount = amount;
  formSection.classList.add("hidden");
  confirmSection.classList.remove("hidden");
};

cancelBtn.onclick = () => {
  confirmSection.classList.add("hidden");
  formSection.classList.remove("hidden");
};

proceedBtn.onclick = async () => {
  proceedBtn.disabled = true;
  proceedBtn.textContent = "Redirecting…";

  const payload = {
    name: nameInput.value.trim(),
    mobile: mobileInput.value.trim().replace(/^(\+91|0)/, ""),
    venue: venueInput.value.trim(),
    amount: proceedBtn.dataset.amount
  };

  const res = await fetch("/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.payment_url) window.location.href = data.payment_url;
  else alert("Failed to create payment");
};
