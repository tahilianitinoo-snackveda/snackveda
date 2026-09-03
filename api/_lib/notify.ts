// ─── NOTIFICATION HELPERS ─────────────────────────────────────────────────
// Transactional email (Resend) and SMS (Fast2SMS): composing and sending
// registration, order-placed and shipping notifications.
const RESEND_KEY = () => process.env.RESEND_API_KEY;
const FAST2SMS_KEY = () => process.env.FAST2SMS_API_KEY;
const FROM_EMAIL = "support@narayanidistributors.com";
const ADMIN_EMAIL = "support@narayanidistributors.com";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY()) { console.error("EMAIL NOT SENT: RESEND_API_KEY is unset.", { to, subject }); return; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Narayani Distributors <${FROM_EMAIL}>`, to, subject, html }),
    });
    // fetch only rejects on a transport failure, so a refusal from Resend — an
    // unverified sending domain, a bad key, a suppressed address — arrives as a
    // perfectly resolved 4xx. Without this check those disappear without a trace.
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      console.error("EMAIL NOT SENT: Resend returned", res.status, body, { to, subject });
    }
  } catch (e) { console.error("EMAIL NOT SENT: transport error:", e?.message, { to, subject }); }
}

export async function sendSMS(phone: string, message: string): Promise<void> {
  if (!FAST2SMS_KEY() || !phone) return;
  try {
    const clean = String(phone).replace(/\D/g,"").replace(/^91/,"").slice(-10);
    if (clean.length !== 10) return;
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_KEY()}&sender_id=SNKVDA&message=${encodeURIComponent(message)}&language=english&route=dlt&numbers=${clean}`, { method: "GET" });
    // Same trap as email: Fast2SMS signals rejection with a status code, not a throw.
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      console.error("SMS NOT SENT: Fast2SMS returned", res.status, body, { phone: clean });
    }
  } catch (e) { console.error("SMS NOT SENT: transport error:", e?.message); }
}

export function emailBase(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#f9f9f7;margin:0}.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.hdr{background:#0F766E;padding:24px 32px}.hdr h1{color:#fff;margin:0;font-size:22px}.hdr p{color:#99F6E4;margin:4px 0 0;font-size:12px}.bdy{padding:32px;color:#1E293B}.bdy h2{color:#0F766E;margin-top:0}.box{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:16px 0}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #E2E8F0;font-size:13px}.row:last-child{border-bottom:none}.lbl{color:#64748B}.val{font-weight:600}.btn{display:inline-block;background:#0F766E;color:#fff!important;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:600;margin:12px 0}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#0F766E;color:#fff;padding:8px 12px;text-align:left;font-size:12px}td{padding:8px 12px;font-size:13px;border-bottom:1px solid #F1F5F9}.ftr{background:#F8FAFC;padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0}</style></head><body><div class="wrap"><div class="hdr"><h1>Narayani Distributors</h1></div><div class="bdy">${content}</div><div class="ftr">&copy; 2025 Narayani Distributors | <a href="https://narayanidistributors.com" style="color:#0F766E">narayanidistributors.com</a></div></div></body></html>`;
}

type NotifyUser = { email: string; fullName: string; phone?: string | null };
type NotifyOrderItem = { name: string; quantity: number; lineTotal: number | string };
type NotifyOrder = { orderNumber: string; totalAmount: number | string; orderType: string; items?: NotifyOrderItem[] };

export async function notifyRegistration(user: NotifyUser, isB2B: boolean): Promise<void> {
  const subject = isB2B ? "Welcome to Narayani Distributors Wholesale!" : "Welcome to Narayani Distributors!";
  const html = emailBase(`<h2>Welcome, ${user.fullName}!</h2><p>${isB2B ? "Your wholesale account is active. You can now place bulk orders at trade pricing." : "You're now part of Narayani Distributors! Your first order gets <strong>15% off</strong>."}</p>${isB2B ? `<div class="box"><div class="row"><span class="lbl">Account</span><span class="val">Wholesale (B2B)</span></div><div class="row"><span class="lbl">Min Order</span><span class="val">₹5,000</span></div></div>` : ""}<a href="https://narayanidistributors.com/shop" class="btn">Shop Now</a>`);
  await sendEmail(user.email, subject, html);
  if (user.phone) await sendSMS(user.phone, isB2B ? `Welcome to Narayani Distributors Wholesale! Your account is active. Order at narayanidistributors.com` : `Welcome to Narayani Distributors! Get 15% off your first order. Shop at narayanidistributors.com`);
}

export async function notifyOrderPlaced(order: NotifyOrder, user: NotifyUser): Promise<void> {
  const itemsHtml = (order.items||[]).map(i => `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${Number(i.lineTotal).toFixed(2)}</td></tr>`).join("");
  const html = emailBase(`<h2>Order Confirmed!</h2><p>Hi ${user.fullName}, your order is placed.</p><div class="box"><div class="row"><span class="lbl">Order No</span><span class="val">${order.orderNumber}</span></div><div class="row"><span class="lbl">Total</span><span class="val">₹${Number(order.totalAmount).toFixed(2)}</span></div><div class="row"><span class="lbl">Pay to UPI</span><span class="val">9898477151@pthdfc</span></div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table><a href="https://narayanidistributors.com/account" class="btn">View Order</a>`);
  await sendEmail(user.email, `Order Confirmed — ${order.orderNumber}`, html);
  if (user.phone) await sendSMS(user.phone, `Narayani Distributors: Order ${order.orderNumber} confirmed. Pay Rs.${Number(order.totalAmount).toFixed(0)} to UPI: 9898477151@pthdfc. View: narayanidistributors.com/account`);
  // Admin alert
  const adminHtml = emailBase(`<h2>New Order: ${order.orderNumber}</h2><div class="box"><div class="row"><span class="lbl">Customer</span><span class="val">${user.fullName}</span></div><div class="row"><span class="lbl">Email</span><span class="val">${user.email}</span></div><div class="row"><span class="lbl">Phone</span><span class="val">${user.phone||"N/A"}</span></div><div class="row"><span class="lbl">Type</span><span class="val">${order.orderType==="b2b"?"Wholesale":"Retail"}</span></div><div class="row"><span class="lbl">Amount</span><span class="val">₹${Number(order.totalAmount).toFixed(2)}</span></div></div><a href="https://narayanidistributors.com/admin/orders" class="btn">View in Admin</a>`);
  await sendEmail(ADMIN_EMAIL, `New ${order.orderType.toUpperCase()} Order — ${order.orderNumber}`, adminHtml);
}

export async function notifyShipping(order: NotifyOrder, user: NotifyUser, courier: string, trackingNumber: string, trackingLink: string): Promise<void> {
  const html = emailBase(`<h2>Your Order is Shipped!</h2><p>Hi ${user.fullName}, your Narayani Distributors order is on the way!</p><div class="box"><div class="row"><span class="lbl">Order No</span><span class="val">${order.orderNumber}</span></div><div class="row"><span class="lbl">Courier</span><span class="val">${courier}</span></div><div class="row"><span class="lbl">AWB / Tracking No</span><span class="val">${trackingNumber}</span></div></div><a href="${trackingLink}" class="btn">Track Your Order</a><p style="color:#64748B;font-size:12px">Estimated delivery: 3-7 business days.</p>`);
  await sendEmail(user.email, `Your Order is Shipped — ${order.orderNumber}`, html);
  if (user.phone) await sendSMS(user.phone, `Narayani Distributors: Order ${order.orderNumber} shipped via ${courier}. AWB: ${trackingNumber}. Track: ${trackingLink}`);
}
