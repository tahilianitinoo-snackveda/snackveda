// SnackVeda Notification Service
// Email: Resend | SMS: Fast2SMS

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY!;
const FROM_EMAIL = "support@snackveda.co.in";
const ADMIN_EMAIL = "support@snackveda.co.in";
const SENDER_ID = "SNKVDA";

// ─── EMAIL ────────────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `SnackVeda <${FROM_EMAIL}>`, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) console.error("Resend error:", data);
    return data;
  } catch (e) { console.error("Email send failed:", e); }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────
async function sendSMS(phone: string, message: string) {
  try {
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);
    if (cleanPhone.length !== 10) return;
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&sender_id=${SENDER_ID}&message=${encodeURIComponent(message)}&language=english&route=dlt&numbers=${cleanPhone}`, {
      method: "GET",
      headers: { "cache-control": "no-cache" },
    });
    const data = await res.json();
    if (!data.return) console.error("Fast2SMS error:", data);
    return data;
  } catch (e) { console.error("SMS send failed:", e); }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────
function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f7; margin: 0; padding: 0; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #0F766E; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: 0.5px; }
  .header p { color: #99F6E4; margin: 4px 0 0; font-size: 13px; }
  .body { padding: 32px; color: #1E293B; }
  .body h2 { color: #0F766E; margin-top: 0; }
  .info-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #64748B; }
  .info-value { font-weight: 600; color: #1E293B; }
  .btn { display: inline-block; background: #0F766E; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
  .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #0F766E; color: #fff; padding: 10px 12px; text-align: left; font-size: 13px; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
  tr:last-child td { border-bottom: none; }
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>SnackVeda</h1>
    <p>By Narayani Distributors</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    &copy; 2025 SnackVeda | Narayani Distributors<br>
    <a href="https://snackveda.co.in" style="color:#0F766E">snackveda.co.in</a> | support@snackveda.co.in
  </div>
</div>
</body></html>`;
}

// ─── NOTIFICATION FUNCTIONS ───────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string, isB2B = false) {
  const subject = isB2B
    ? "Welcome to SnackVeda — Your Wholesale Account is Ready"
    : "Welcome to SnackVeda — Start Snacking Smarter!";

  const html = baseTemplate(`
    <h2>Welcome, ${name}!</h2>
    <p>${isB2B
      ? "Your <strong>SnackVeda Wholesale Account</strong> has been created successfully. You now have access to trade pricing and bulk ordering."
      : "You're now part of the SnackVeda family! Discover our range of healthy, delicious snacks made with better ingredients."
    }</p>
    ${isB2B ? `
    <div class="info-box">
      <div class="info-row"><span class="info-label">Account Type</span><span class="info-value">Wholesale (B2B)</span></div>
      <div class="info-row"><span class="info-label">Minimum Order</span><span class="info-value">₹5,000</span></div>
      <div class="info-row"><span class="info-label">Order Multiples</span><span class="info-value">As per MOQ per SKU</span></div>
    </div>` : ""}
    <a href="https://snackveda.co.in/shop" class="btn">Start Shopping</a>
    <p style="color:#64748B;font-size:13px">Questions? Reply to this email or WhatsApp us at +91 9898477151</p>
  `);

  await sendEmail(email, subject, html);

  const sms = isB2B
    ? `Welcome to SnackVeda! Your wholesale account is active. Min order Rs.5000. Shop at snackveda.co.in`
    : `Welcome to SnackVeda! Shop healthy snacks at snackveda.co.in. Your first order gets 15% off!`;
  // SMS on registration only if phone available — called separately
}

export async function sendOrderConfirmationEmail(order: any, customer: any) {
  const isB2B = order.orderType === "b2b";
  const subject = `Order Confirmed — ${order.orderNumber} | SnackVeda`;

  const itemsHtml = order.items?.map((i: any) => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">₹${Number(i.unitPrice).toFixed(2)}</td>
      <td style="text-align:right">₹${Number(i.lineTotal).toFixed(2)}</td>
    </tr>
  `).join("") || "";

  const html = baseTemplate(`
    <h2>Order Confirmed!</h2>
    <p>Hi ${customer.fullName}, your order has been placed successfully.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Order Number</span><span class="info-value">${order.orderNumber}</span></div>
      <div class="info-row"><span class="info-label">Order Type</span><span class="info-value">${isB2B ? "Wholesale" : "Retail"}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value">Payment Pending</span></div>
    </div>
    <table>
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Subtotal</span><span class="info-value">₹${Number(order.subtotal).toFixed(2)}</span></div>
      ${order.discountAmount > 0 ? `<div class="info-row"><span class="info-label">Discount</span><span class="info-value" style="color:#16A34A">-₹${Number(order.discountAmount).toFixed(2)}</span></div>` : ""}
      <div class="info-row"><span class="info-label">GST (5%)</span><span class="info-value">₹${Number(order.gstAmount).toFixed(2)}</span></div>
      ${order.shippingCharge > 0 ? `<div class="info-row"><span class="info-label">Shipping</span><span class="info-value">₹${Number(order.shippingCharge).toFixed(2)}</span></div>` : `<div class="info-row"><span class="info-label">Shipping</span><span class="info-value" style="color:#16A34A">Free</span></div>`}
      <div class="info-row"><span class="info-label" style="font-weight:700">Total Payable</span><span class="info-value" style="font-size:16px;color:#0F766E">₹${Number(order.totalAmount).toFixed(2)}</span></div>
    </div>
    <p><strong>Payment:</strong> Please pay ₹${Number(order.totalAmount).toFixed(2)} to UPI ID: <strong>9898477151@pthdfc</strong> (Narayani Distributors) and share the UTR reference.</p>
    <a href="https://snackveda.co.in/account" class="btn">View Order</a>
  `);

  await sendEmail(customer.email, subject, html);
}

export async function sendOrderConfirmationSMS(phone: string, orderNumber: string, amount: number) {
  const msg = `SnackVeda: Order ${orderNumber} placed. Pay Rs.${amount} to UPI: 9898477151@pthdfc. Track at snackveda.co.in/account`;
  await sendSMS(phone, msg);
}

export async function sendShippingEmail(order: any, customer: any, trackingInfo: { courier: string; trackingNumber: string; trackingLink: string }) {
  const subject = `Your Order is Shipped — ${order.orderNumber} | SnackVeda`;

  const html = baseTemplate(`
    <h2>Your Order is on the Way!</h2>
    <p>Hi ${customer.fullName}, great news — your SnackVeda order has been dispatched!</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Order Number</span><span class="info-value">${order.orderNumber}</span></div>
      <div class="info-row"><span class="info-label">Courier</span><span class="info-value">${trackingInfo.courier}</span></div>
      <div class="info-row"><span class="info-label">Tracking Number</span><span class="info-value">${trackingInfo.trackingNumber}</span></div>
    </div>
    <a href="${trackingInfo.trackingLink}" class="btn">Track Your Order</a>
    <p style="color:#64748B;font-size:13px">Estimated delivery: 3–7 business days. Questions? Contact us at support@snackveda.co.in</p>
  `);

  await sendEmail(customer.email, subject, html);
}

export async function sendShippingSMS(phone: string, orderNumber: string, courier: string, trackingNumber: string, trackingLink: string) {
  const msg = `SnackVeda: Order ${orderNumber} shipped via ${courier}. Track: ${trackingLink} | AWB: ${trackingNumber}`;
  await sendSMS(phone, msg);
}

export async function sendAdminNewOrderAlert(order: any, customer: any) {
  const subject = `New Order — ${order.orderNumber} (${order.orderType.toUpperCase()}) | SnackVeda Admin`;

  const html = baseTemplate(`
    <h2>New Order Received</h2>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Order Number</span><span class="info-value">${order.orderNumber}</span></div>
      <div class="info-row"><span class="info-label">Type</span><span class="info-value">${order.orderType === "b2b" ? "Wholesale (B2B)" : "Retail (B2C)"}</span></div>
      <div class="info-row"><span class="info-label">Customer</span><span class="info-value">${customer.fullName}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${customer.email}</span></div>
      <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${customer.phone || "N/A"}</span></div>
      <div class="info-row"><span class="info-label">Amount</span><span class="info-value">₹${Number(order.totalAmount).toFixed(2)}</span></div>
    </div>
    <a href="https://snackveda.co.in/admin/orders" class="btn">View in Admin</a>
  `);

  await sendEmail(ADMIN_EMAIL, subject, html);
}
