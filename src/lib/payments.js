// Payment helpers: online payment apps (through Razorpay) + Cash on Delivery fee.

// Extra amount charged when the buyer chooses Cash on Delivery (change here to adjust).
export const COD_FEE = 40;

// "rzp" is the app code Razorpay understands. null = show every UPI app on the phone.
export const UPI_APPS = [
  { id: "paytm", name: "Paytm", rzp: "paytm" },
  { id: "phonepe", name: "PhonePe", rzp: "phonepe" },
  { id: "gpay", name: "Google Pay", rzp: "google_pay" },
  { id: "any", name: "Other UPI app", rzp: null },
];

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const paymentStatusLabel = {
  pending: "Payment pending",
  awaiting_verification: "Payment under verification",
  paid: "Paid",
  cod_pending: "Cash on delivery",
  cancelled: "Cancelled",
};
