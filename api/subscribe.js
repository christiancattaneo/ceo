const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, company, url } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Valid work email required." });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL || "christiandcattaneo@gmail.com";

  if (resendKey) {
    const details = [
      company ? `Company: ${company}` : null,
      url ? `Product URL: ${url}` : null,
      `Email: ${email}`,
    ]
      .filter(Boolean)
      .join("<br>");

    // Welcome to applicant
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CEO / OpenClaw <noreply@ceo-plum-ten.vercel.app>",
        to: [email],
        subject: "You're on the CEO early access list",
        html: `<p>You're on the list. We'll send your CEO score + audit within 48 hours.</p><p>— The CEO team</p>`,
      }),
    }).catch(() => {});

    // Notification to owner
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CEO / OpenClaw <noreply@ceo-plum-ten.vercel.app>",
        to: [notifyEmail],
        subject: `New CEO access request: ${email}`,
        html: `<p>New early access request:</p><p>${details}</p>`,
      }),
    }).catch(() => {});
  }

  return res.status(200).json({ success: true });
};
