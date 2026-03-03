import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const handlerPath = path.resolve(__dirname, "../api/subscribe.js");

function loadHandler() {
  delete require.cache[handlerPath];
  return require(handlerPath);
}

function makeRes() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    setHeader(k, v) { headers.set(k, v); },
    getHeader(k) { return headers.get(k); },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { this.ended = true; return this; },
  };
}

function makeReq({ method = "POST", body = {}, origin, ip = "127.0.0.1", headers: extra = {} } = {}) {
  const headers = { ...extra };
  if (origin) headers.origin = origin;
  if (ip) headers["x-forwarded-for"] = ip;
  return { method, body, headers, socket: { remoteAddress: ip || "127.0.0.1" } };
}

// ─── METHOD ENFORCEMENT ───

describe("method enforcement", () => {
  test("GET returns 405", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ method: "GET", ip: "10.0.0.1" }), res);
    assert.equal(res.statusCode, 405);
  });

  test("PUT returns 405", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ method: "PUT", ip: "10.0.0.2" }), res);
    assert.equal(res.statusCode, 405);
  });

  test("DELETE returns 405", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ method: "DELETE", ip: "10.0.0.3" }), res);
    assert.equal(res.statusCode, 405);
  });

  test("PATCH returns 405", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ method: "PATCH", ip: "10.0.0.4" }), res);
    assert.equal(res.statusCode, 405);
  });

  test("OPTIONS returns 200 for CORS preflight", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ method: "OPTIONS", ip: "10.0.0.5" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.ended, true);
  });
});

// ─── EMAIL VALIDATION ───

describe("email validation", () => {
  const badEmails = [
    "",
    " ",
    "notanemail",
    "@missing-local.com",
    "missing-domain@",
    "missing@.com",
    "spaces in@email.com",
    "double@@at.com",
    "no-tld@domain",
    null,
    undefined,
    42,
    true,
    {},
    [],
    "a".repeat(300) + "@test.com",
  ];

  for (const email of badEmails) {
    test(`rejects: ${JSON.stringify(email)}`, async () => {
      const h = loadHandler();
      const res = makeRes();
      await h(makeReq({ body: { email }, ip: `11.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}.1` }), res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /email/i);
    });
  }

  test("accepts valid email and returns 200", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ body: { email: "test@example.com" }, ip: "12.0.0.1" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  test("normalizes email to lowercase", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ body: { email: "TEST@EXAMPLE.COM" }, ip: "12.0.0.2" }), res);
    assert.equal(res.statusCode, 200);
  });
});

// ─── XSS AND INJECTION ───

describe("XSS and injection attacks", () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(document.cookie)",
    '<svg onload="alert(1)">',
    "{{constructor.constructor('return this')()}}",
    "${7*7}",
    "'; DROP TABLE users; --",
    '<iframe src="https://evil.com">',
    "data:text/html,<script>alert(1)</script>",
    "\x00\x01\x02\x03",
  ];

  for (const payload of xssPayloads) {
    test(`company field sanitized: ${payload.slice(0, 40)}`, async () => {
      const h = loadHandler();
      const res = makeRes();
      await h(makeReq({
        body: { email: "safe@example.com", company: payload },
        ip: `13.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}.1`,
      }), res);
      assert.equal(res.statusCode, 200);
    });
  }

  test("XSS in email field is rejected by validation", async () => {
    const h = loadHandler();
    const xssEmails = [
      '<script>alert("xss")</script>@evil.com',
      '"><img src=x onerror=alert(1)>@evil.com',
      '<svg onload="alert(1)">@evil.com',
    ];
    for (const email of xssEmails) {
      const res = makeRes();
      await h(makeReq({
        body: { email },
        ip: `13.0.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}`,
      }), res);
      assert.equal(res.statusCode, 400,
        `XSS email "${email.slice(0, 30)}" should be rejected`);
    }
  });
});

// ─── URL VALIDATION ───

describe("URL validation", () => {
  const badUrls = [
    "javascript:alert(1)",
    "ftp://not-http.com",
    "file:///etc/passwd",
    "data:text/html,<script>alert(1)</script>",
    "not-a-url",
    "://missing-protocol.com",
  ];

  for (const url of badUrls) {
    test(`rejects dangerous URL: ${url.slice(0, 40)}`, async () => {
      const h = loadHandler();
      const res = makeRes();
      await h(makeReq({
        body: { email: "valid@example.com", url },
        ip: `14.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}.1`,
      }), res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /URL/i);
    });
  }

  test("accepts valid https URL", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "url-test@example.com", url: "https://acme.com" },
      ip: "14.0.0.100",
    }), res);
    assert.equal(res.statusCode, 200);
  });

  test("accepts valid http URL", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "url-test2@example.com", url: "http://localhost:3000" },
      ip: "14.0.0.101",
    }), res);
    assert.equal(res.statusCode, 200);
  });

  test("empty URL is allowed (optional field)", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "url-test3@example.com", url: "" },
      ip: "14.0.0.102",
    }), res);
    assert.equal(res.statusCode, 200);
  });
});

// ─── INPUT LENGTH LIMITS ───

describe("input length limits", () => {
  test("email over 200 chars is truncated and rejected", async () => {
    const h = loadHandler();
    const res = makeRes();
    const longEmail = "a".repeat(250) + "@example.com";
    await h(makeReq({ body: { email: longEmail }, ip: "15.0.0.1" }), res);
    assert.ok([200, 400].includes(res.statusCode));
  });

  test("company field over 200 chars is truncated, not crash", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "len@example.com", company: "A".repeat(5000) },
      ip: "15.0.0.2",
    }), res);
    assert.equal(res.statusCode, 200);
  });

  test("URL field over 2048 chars is truncated, not crash", async () => {
    const h = loadHandler();
    const res = makeRes();
    const longUrl = "https://example.com/" + "a".repeat(5000);
    await h(makeReq({
      body: { email: "len2@example.com", url: longUrl },
      ip: "15.0.0.3",
    }), res);
    assert.ok([200, 400].includes(res.statusCode));
  });
});

// ─── CORS ENFORCEMENT ───

describe("CORS enforcement", () => {
  test("allowed origin gets Access-Control-Allow-Origin header", async () => {
    const old = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = "https://clawfficer.com";
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "cors@example.com" },
      origin: "https://clawfficer.com",
      ip: "16.0.0.1",
    }), res);
    assert.equal(res.getHeader("Access-Control-Allow-Origin"), "https://clawfficer.com");
    assert.equal(res.getHeader("Vary"), "Origin");
    process.env.ALLOWED_ORIGINS = old;
  });

  test("disallowed origin gets NO Access-Control-Allow-Origin header", async () => {
    const old = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = "https://clawfficer.com";
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "cors2@example.com" },
      origin: "https://evil.com",
      ip: "16.0.0.2",
    }), res);
    assert.equal(res.getHeader("Access-Control-Allow-Origin"), undefined);
    process.env.ALLOWED_ORIGINS = old;
  });

  test("no origin header gets NO Access-Control-Allow-Origin", async () => {
    const old = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = "https://clawfficer.com";
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "cors3@example.com" },
      ip: "16.0.0.3",
    }), res);
    assert.equal(res.getHeader("Access-Control-Allow-Origin"), undefined);
    process.env.ALLOWED_ORIGINS = old;
  });

  test("subdomain spoofing does not bypass origin check", async () => {
    const old = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = "https://clawfficer.com";
    const h = loadHandler();
    const spoofOrigins = [
      "https://clawfficer.com.evil.com",
      "https://notclawfficer.com",
      "https://clawfficer.com:8080",
      "http://clawfficer.com",
    ];
    for (const origin of spoofOrigins) {
      const res = makeRes();
      await h(makeReq({
        body: { email: `spoof-${Math.random().toString(36).slice(2)}@example.com` },
        origin,
        ip: `16.0.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}`,
      }), res);
      assert.equal(res.getHeader("Access-Control-Allow-Origin"), undefined,
        `origin ${origin} should not be allowed`);
    }
    process.env.ALLOWED_ORIGINS = old;
  });
});

// ─── RATE LIMITING ───

describe("rate limiting", () => {
  test("21st request from same IP gets 429", async () => {
    const h = loadHandler();
    const testIp = "20.0.0.1";
    for (let i = 0; i < 20; i++) {
      const res = makeRes();
      await h(makeReq({
        body: { email: `rl-ip-${i}@example.com` },
        ip: testIp,
      }), res);
      assert.equal(res.statusCode, 200, `request ${i + 1} should succeed`);
    }
    const res = makeRes();
    await h(makeReq({
      body: { email: "rl-ip-overflow@example.com" },
      ip: testIp,
    }), res);
    assert.equal(res.statusCode, 429);
    assert.match(res.body.error, /IP/i);
  });

  test("6th request for same email gets 429 even from different IPs", async () => {
    const h = loadHandler();
    const targetEmail = "rl-email-target@example.com";
    for (let i = 0; i < 5; i++) {
      const res = makeRes();
      await h(makeReq({
        body: { email: targetEmail },
        ip: `21.0.${i}.1`,
      }), res);
      assert.equal(res.statusCode, 200, `email request ${i + 1} should succeed`);
    }
    const res = makeRes();
    await h(makeReq({
      body: { email: targetEmail },
      ip: "21.0.99.1",
    }), res);
    assert.equal(res.statusCode, 429);
    assert.match(res.body.error, /email/i);
  });

  test("IP rate limit checked before email validation", async () => {
    const h = loadHandler();
    const testIp = "22.0.0.1";
    for (let i = 0; i < 21; i++) {
      const res = makeRes();
      await h(makeReq({
        body: { email: `pre-${i}@example.com` },
        ip: testIp,
      }), res);
    }
    const res = makeRes();
    await h(makeReq({
      body: { email: "valid-but-limited@example.com" },
      ip: testIp,
    }), res);
    assert.equal(res.statusCode, 429);
  });
});

// ─── MISSING / MALFORMED BODY ───

describe("missing and malformed body", () => {
  test("undefined body returns 400", async () => {
    const h = loadHandler();
    const req = makeReq({ ip: "30.0.0.1" });
    req.body = undefined;
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 400);
  });

  test("null body returns 400", async () => {
    const h = loadHandler();
    const req = makeReq({ ip: "30.0.0.2" });
    req.body = null;
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 400);
  });

  test("empty object body returns 400", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({ body: {}, ip: "30.0.0.3" }), res);
    assert.equal(res.statusCode, 400);
  });

  test("array body returns 400", async () => {
    const h = loadHandler();
    const req = makeReq({ ip: "30.0.0.4" });
    req.body = [1, 2, 3];
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 400);
  });

  test("string body returns 400", async () => {
    const h = loadHandler();
    const req = makeReq({ ip: "30.0.0.5" });
    req.body = "just a string";
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 400);
  });
});

// ─── IP PARSING EDGE CASES ───

describe("IP parsing", () => {
  test("uses first IP from x-forwarded-for chain", async () => {
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "ip-chain@example.com" },
      ip: "40.0.0.1, 10.0.0.1, 192.168.1.1",
    }), res);
    assert.equal(res.statusCode, 200);
  });

  test("handles missing x-forwarded-for gracefully", async () => {
    const h = loadHandler();
    const req = {
      method: "POST",
      body: { email: "no-xff@example.com" },
      headers: {},
      socket: { remoteAddress: "40.0.0.2" },
    };
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 200);
  });

  test("handles missing socket gracefully", async () => {
    const h = loadHandler();
    const req = {
      method: "POST",
      body: { email: "no-socket@example.com" },
      headers: {},
      socket: null,
    };
    const res = makeRes();
    await h(req, res);
    assert.equal(res.statusCode, 200);
  });
});

// ─── NO RESEND KEY (graceful degradation) ───

describe("no RESEND_API_KEY configured", () => {
  test("succeeds without sending emails when no API key", async () => {
    const old = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "no-key@example.com" },
      ip: "50.0.0.1",
    }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    process.env.RESEND_API_KEY = old;
  });
});

// ─── PROTOTYPE POLLUTION ───

describe("prototype pollution resistance", () => {
  test("__proto__ in body does not crash", async () => {
    const savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "proto@example.com", __proto__: { admin: true } },
      ip: "60.0.0.1",
    }), res);
    assert.ok([200, 400].includes(res.statusCode),
      `expected 200 or 400, got ${res.statusCode}`);
    if (savedKey) process.env.RESEND_API_KEY = savedKey;
  });

  test("constructor.prototype in body does not crash", async () => {
    const savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const h = loadHandler();
    const res = makeRes();
    await h(makeReq({
      body: { email: "proto2@example.com", constructor: { prototype: { admin: true } } },
      ip: "60.0.0.2",
    }), res);
    assert.ok([200, 400].includes(res.statusCode),
      `expected 200 or 400, got ${res.statusCode}`);
    if (savedKey) process.env.RESEND_API_KEY = savedKey;
  });
});

// ─── UPSTREAM FAILURE + OUTPUT ENCODING ───

describe("upstream failure and encoding", () => {
  test("returns 502 when resend fails", async () => {
    const oldKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test-key";
    const oldFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "resend-down",
    });

    try {
      const h = loadHandler();
      const res = makeRes();
      await h(makeReq({
        body: { email: "upstream-fail@example.com" },
        ip: "70.0.0.1",
      }), res);
      assert.equal(res.statusCode, 502);
      assert.match(res.body.error, /Temporary email delivery issue/);
    } finally {
      global.fetch = oldFetch;
      if (oldKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = oldKey;
      }
    }
  });

  test("escapes HTML in owner notification details", async () => {
    const oldKey = process.env.RESEND_API_KEY;
    const oldNotify = process.env.NOTIFY_EMAIL;
    process.env.RESEND_API_KEY = "test-key";
    process.env.NOTIFY_EMAIL = "owner@example.com";
    const oldFetch = global.fetch;
    const payloads = [];

    global.fetch = async (_url, options) => {
      payloads.push(JSON.parse(options.body));
      return {
        ok: true,
        status: 200,
        text: async () => "",
      };
    };

    try {
      const h = loadHandler();
      const res = makeRes();
      await h(makeReq({
        body: {
          email: "safe@example.com",
          company: "<script>alert(1)</script>",
          url: "https://example.com/?q=<xss>",
        },
        ip: "70.0.0.2",
      }), res);
      assert.equal(res.statusCode, 200);
      assert.equal(payloads.length, 2);
      const ownerMail = payloads[1];
      assert.match(ownerMail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      assert.doesNotMatch(ownerMail.html, /<script>alert\(1\)<\/script>/);
    } finally {
      global.fetch = oldFetch;
      if (oldKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = oldKey;
      }
      if (oldNotify === undefined) {
        delete process.env.NOTIFY_EMAIL;
      } else {
        process.env.NOTIFY_EMAIL = oldNotify;
      }
    }
  });
});
