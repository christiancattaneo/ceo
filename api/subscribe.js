const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 20;
const MAX_REQUESTS_PER_EMAIL = 5;
const RATE_LIMIT_STATE = new Map();

function nowMs() {
  return Date.now();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeInput(value, maxLength = MAX_FIELD_LENGTH) {
  if (!value) {
    return "";
  }
  const cleaned = String(value).trim().replace(/\s+/g, " ");
  return cleaned.slice(0, maxLength);
}

function toOriginSet() {
  const configured = process.env.ALLOWED_ORIGINS || "https://clawfficer.com";
  return new Set(
    configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function setCors(req, res) {
  const allowedOrigins = toOriginSet();
  const requestOrigin = req.headers.origin || "";
  if (allowedOrigins.has(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function gcRateState(currentTs) {
  for (const [key, state] of RATE_LIMIT_STATE.entries()) {
    if (state.expiresAt <= currentTs) {
      RATE_LIMIT_STATE.delete(key);
    }
  }
}

function hitRateLimit(key, maxRequests, currentTs) {
  const existing = RATE_LIMIT_STATE.get(key);
  if (!existing || existing.expiresAt <= currentTs) {
    RATE_LIMIT_STATE.set(key, { count: 1, expiresAt: currentTs + WINDOW_MS });
    return false;
  }
  existing.count += 1;
  RATE_LIMIT_STATE.set(key, existing);
  return existing.count > maxRequests;
}

function isValidAbsoluteUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function sendEmail(resendKey, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ts = nowMs();
  gcRateState(ts);
  const ip = parseIp(req);
  if (hitRateLimit(`ip:${ip}`, MAX_REQUESTS_PER_IP, ts)) {
    return res.status(429).json({ error: "Too many requests from this IP. Try later." });
  }

  const email = normalizeInput(req.body?.email).toLowerCase();
  const company = normalizeInput(req.body?.company);
  const url = normalizeInput(req.body?.url, MAX_URL_LENGTH);

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Valid work email required." });
  }

  if (hitRateLimit(`email:${email}`, MAX_REQUESTS_PER_EMAIL, ts)) {
    return res.status(429).json({ error: "Too many requests for this email. Try later." });
  }

  if (url && !isValidAbsoluteUrl(url)) {
    return res.status(400).json({ error: "Product URL must be a valid absolute URL." });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL || "christiandcattaneo@gmail.com";
  const safeDetails = [
    company ? `Company: ${escapeHtml(company)}` : null,
    url ? `Product URL: ${escapeHtml(url)}` : null,
    `Email: ${escapeHtml(email)}`,
    `IP: ${escapeHtml(ip)}`,
    `Timestamp: ${new Date(ts).toISOString()}`,
  ]
    .filter(Boolean)
    .join("<br>");

  if (resendKey) {
    try {
      await sendEmail(resendKey, {
        from: process.env.FROM_EMAIL || "CEO / OpenClaw <noreply@clawfficer.com>",
        to: [email],
        subject: "You're on the CEO early access list",
        html: "<p>You're on the list. We'll send your CEO score + audit within 48 hours.</p><p>The CEO team</p>",
      });

      await sendEmail(resendKey, {
        from: process.env.FROM_EMAIL || "CEO / OpenClaw <noreply@clawfficer.com>",
        to: [notifyEmail],
        subject: `New CEO access request: ${email}`,
        html: `<p>New early access request:</p><p>${safeDetails}</p>`,
      });
    } catch (err) {
      console.error("[subscribe] Email delivery failed", {
        message: err instanceof Error ? err.message : String(err),
        email,
      });
      return res.status(502).json({ error: "Temporary email delivery issue. Please retry." });
    }
  }

  return res.status(200).json({ success: true });
};
