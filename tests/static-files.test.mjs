import assert from "node:assert/strict";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// ─── FILE EXISTENCE ───

describe("required files exist", () => {
  const required = [
    "index.html",
    "llms.txt",
    "llms-full.txt",
    "robots.txt",
    "sitemap.xml",
    "vercel.json",
    ".well-known/agent.json",
    ".well-known/security.txt",
    ".gitignore",
    "package.json",
  ];

  for (const f of required) {
    test(`${f} exists`, () => {
      assert.ok(fileExists(f), `${f} is missing`);
    });
  }

  for (const f of required) {
    test(`${f} is not empty`, () => {
      const content = readFile(f);
      assert.ok(content.trim().length > 0, `${f} is empty`);
    });
  }
});

// ─── LLMS.TXT SPEC COMPLIANCE ───

describe("llms.txt specification compliance", () => {
  let content;

  test("loads without error", () => {
    content = readFile("llms.txt");
    assert.ok(content.length > 0);
  });

  test("starts with H1 title (# Name)", () => {
    const firstLine = content.split("\n").find(l => l.trim().length > 0);
    assert.ok(firstLine.startsWith("# "), `first non-empty line must be H1, got: ${firstLine}`);
  });

  test("has blockquote description (> ...)", () => {
    assert.ok(content.includes("\n> "), "missing blockquote description");
  });

  test("has at least one H2 section (## ...)", () => {
    const h2s = content.match(/^## .+$/gm);
    assert.ok(h2s && h2s.length >= 1, "must have at least one H2 section");
  });

  test("has annotated links in markdown format", () => {
    const links = content.match(/- \[.+?\]\(.+?\)/gm);
    assert.ok(links && links.length >= 1, "must have at least one annotated link");
  });

  test("file size is under 50KB per spec recommendation", () => {
    const bytes = Buffer.byteLength(content, "utf-8");
    assert.ok(bytes < 50 * 1024, `llms.txt is ${bytes} bytes, should be under 50KB`);
  });

  test("uses UTF-8 encoding (no BOM)", () => {
    const buf = fs.readFileSync(path.join(ROOT, "llms.txt"));
    assert.ok(buf[0] !== 0xef || buf[1] !== 0xbb || buf[2] !== 0xbf, "should not have BOM");
  });

  test("no HTML tags leaked into markdown", () => {
    assert.ok(!/<[a-z][a-z0-9]*[\s>]/i.test(content), "llms.txt should be pure markdown, no HTML");
  });
});

// ─── LLMS-FULL.TXT ───

describe("llms-full.txt", () => {
  let content;

  test("loads and starts with H1", () => {
    content = readFile("llms-full.txt");
    const firstLine = content.split("\n").find(l => l.trim().length > 0);
    assert.ok(firstLine.startsWith("# "), "must start with H1");
  });

  test("has blockquote description", () => {
    assert.ok(content.includes("\n> "), "missing blockquote");
  });

  test("is longer than llms.txt (extended docs)", () => {
    const short = readFile("llms.txt");
    assert.ok(content.length > short.length,
      "llms-full.txt should be longer than llms.txt");
  });

  test("mentions API reference", () => {
    assert.ok(/api/i.test(content), "should document the API");
  });

  test("mentions pricing", () => {
    assert.ok(/pricing|price|\$49|\$299|free/i.test(content), "should document pricing");
  });

  test("no HTML tags", () => {
    assert.ok(!/<[a-z][a-z0-9]*[\s>]/i.test(content), "should be pure markdown");
  });
});

// ─── ROBOTS.TXT ───

describe("robots.txt", () => {
  let content;

  test("loads successfully", () => {
    content = readFile("robots.txt");
    assert.ok(content.length > 0);
  });

  test("has sitemap directive", () => {
    assert.ok(/^Sitemap:\s*https:\/\/clawfficer\.com\/sitemap\.xml$/m.test(content),
      "must have Sitemap pointing to clawfficer.com/sitemap.xml");
  });

  test("blocks GPTBot (training crawler)", () => {
    const gptSection = content.match(/User-agent:\s*GPTBot[\s\S]*?(?=User-agent:|$)/);
    assert.ok(gptSection, "must have GPTBot section");
    assert.ok(/Disallow:\s*\//.test(gptSection[0]), "GPTBot must be disallowed");
  });

  test("blocks ClaudeBot (training crawler)", () => {
    const section = content.match(/User-agent:\s*ClaudeBot[\s\S]*?(?=User-agent:|$)/);
    assert.ok(section, "must have ClaudeBot section");
    assert.ok(/Disallow:\s*\//.test(section[0]), "ClaudeBot must be disallowed");
  });

  test("blocks CCBot (training crawler)", () => {
    const section = content.match(/User-agent:\s*CCBot[\s\S]*?(?=User-agent:|$)/);
    assert.ok(section, "must have CCBot section");
    assert.ok(/Disallow:\s*\//.test(section[0]), "CCBot must be disallowed");
  });

  test("blocks Bytespider (training crawler)", () => {
    const section = content.match(/User-agent:\s*Bytespider[\s\S]*?(?=User-agent:|$)/);
    assert.ok(section, "must have Bytespider section");
    assert.ok(/Disallow:\s*\//.test(section[0]), "Bytespider must be disallowed");
  });

  test("blocks Google-Extended (training crawler)", () => {
    const section = content.match(/User-agent:\s*Google-Extended[\s\S]*?(?=User-agent:|$)/);
    assert.ok(section, "must have Google-Extended section");
    assert.ok(/Disallow:\s*\//.test(section[0]), "Google-Extended must be disallowed");
  });

  test("disallows /api/ for all bots", () => {
    assert.ok(/Disallow:\s*\/api\//m.test(content), "/api/ must be disallowed");
  });

  test("does NOT block Googlebot", () => {
    const section = content.match(/User-agent:\s*Googlebot[\s\S]*?(?=User-agent:|$)/);
    if (section) {
      assert.ok(!/Disallow:\s*\/\s*$/m.test(section[0]), "Googlebot must not be fully disallowed");
    }
  });

  test("does NOT block PerplexityBot", () => {
    const section = content.match(/User-agent:\s*PerplexityBot[\s\S]*?(?=User-agent:|$)/);
    if (section) {
      assert.ok(!/Disallow:\s*\/\s*$/m.test(section[0]), "PerplexityBot must not be fully disallowed");
    }
  });
});

// ─── SITEMAP.XML ───

describe("sitemap.xml", () => {
  let content;

  test("loads and is valid XML structure", () => {
    content = readFile("sitemap.xml");
    assert.ok(content.startsWith("<?xml"), "must start with XML declaration");
    assert.ok(content.includes("<urlset"), "must have urlset element");
    assert.ok(content.includes("</urlset>"), "must close urlset element");
  });

  test("no duplicate XML declarations (corruption check)", () => {
    const declarations = content.match(/<\?xml/g);
    assert.equal(declarations.length, 1, "must have exactly one XML declaration");
  });

  test("contains canonical homepage URL", () => {
    assert.ok(content.includes("<loc>https://clawfficer.com/</loc>"),
      "must include canonical homepage");
  });

  test("contains llms.txt URL", () => {
    assert.ok(content.includes("<loc>https://clawfficer.com/llms.txt</loc>"),
      "must include llms.txt");
  });

  test("all URLs use HTTPS", () => {
    const locs = content.match(/<loc>(.*?)<\/loc>/g) || [];
    for (const loc of locs) {
      const url = loc.replace(/<\/?loc>/g, "");
      assert.ok(url.startsWith("https://"), `URL must use HTTPS: ${url}`);
    }
  });

  test("all URLs point to clawfficer.com", () => {
    const locs = content.match(/<loc>(.*?)<\/loc>/g) || [];
    for (const loc of locs) {
      const url = loc.replace(/<\/?loc>/g, "");
      assert.ok(url.startsWith("https://clawfficer.com"), `URL must be on clawfficer.com: ${url}`);
    }
  });

  test("priorities are between 0.0 and 1.0", () => {
    const priorities = content.match(/<priority>(.*?)<\/priority>/g) || [];
    for (const p of priorities) {
      const val = parseFloat(p.replace(/<\/?priority>/g, ""));
      assert.ok(val >= 0 && val <= 1, `priority must be 0-1, got ${val}`);
    }
  });
});

// ─── AGENT.JSON (A2A SPEC) ───

describe("agent.json A2A compliance", () => {
  let agent;

  test("parses as valid JSON", () => {
    const raw = readFile(".well-known/agent.json");
    agent = JSON.parse(raw);
  });

  test("has required name field", () => {
    assert.ok(typeof agent.name === "string" && agent.name.length > 0);
  });

  test("has required description field", () => {
    assert.ok(typeof agent.description === "string" && agent.description.length > 0);
  });

  test("has required url field pointing to clawfficer.com", () => {
    assert.ok(agent.url.includes("clawfficer.com"));
  });

  test("has version string", () => {
    assert.ok(typeof agent.version === "string");
    assert.match(agent.version, /^\d+\.\d+\.\d+$/);
  });

  test("has provider with organization and url", () => {
    assert.ok(agent.provider);
    assert.ok(typeof agent.provider.organization === "string");
    assert.ok(typeof agent.provider.url === "string");
  });

  test("has capabilities object", () => {
    assert.ok(typeof agent.capabilities === "object");
    assert.ok(typeof agent.capabilities.streaming === "boolean");
    assert.ok(typeof agent.capabilities.pushNotifications === "boolean");
  });

  test("has skills array with at least 1 skill", () => {
    assert.ok(Array.isArray(agent.skills));
    assert.ok(agent.skills.length >= 1, "must have at least one skill");
  });

  test("every skill has id, name, description, tags, examples", () => {
    for (const skill of agent.skills) {
      assert.ok(typeof skill.id === "string" && skill.id.length > 0, `skill missing id`);
      assert.ok(typeof skill.name === "string" && skill.name.length > 0, `skill ${skill.id} missing name`);
      assert.ok(typeof skill.description === "string" && skill.description.length > 0, `skill ${skill.id} missing description`);
      assert.ok(Array.isArray(skill.tags) && skill.tags.length > 0, `skill ${skill.id} missing tags`);
      assert.ok(Array.isArray(skill.examples) && skill.examples.length > 0, `skill ${skill.id} missing examples`);
    }
  });

  test("skill IDs are unique", () => {
    const ids = agent.skills.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate skill IDs found");
  });

  test("defaultInputModes and defaultOutputModes are arrays", () => {
    assert.ok(Array.isArray(agent.defaultInputModes));
    assert.ok(Array.isArray(agent.defaultOutputModes));
  });
});

// ─── VERCEL.JSON ───

describe("vercel.json", () => {
  let config;

  test("parses as valid JSON", () => {
    config = JSON.parse(readFile("vercel.json"));
  });

  test("has security headers for all routes", () => {
    const globalHeaders = config.headers.find(h => h.source === "/(.*)");
    assert.ok(globalHeaders, "must have global header rule");
    const headerNames = globalHeaders.headers.map(h => h.key.toLowerCase());
    assert.ok(headerNames.includes("x-content-type-options"), "missing X-Content-Type-Options");
    assert.ok(headerNames.includes("x-frame-options"), "missing X-Frame-Options");
    assert.ok(headerNames.includes("referrer-policy"), "missing Referrer-Policy");
    assert.ok(headerNames.includes("content-security-policy"), "missing CSP");
    assert.ok(headerNames.includes("strict-transport-security"), "missing HSTS");
  });

  test("X-Frame-Options is DENY", () => {
    const globalHeaders = config.headers.find(h => h.source === "/(.*)");
    const xfo = globalHeaders.headers.find(h => h.key === "X-Frame-Options");
    assert.equal(xfo.value, "DENY");
  });

  test("HSTS max-age is at least 1 year", () => {
    const globalHeaders = config.headers.find(h => h.source === "/(.*)");
    const hsts = globalHeaders.headers.find(h => h.key === "Strict-Transport-Security");
    const maxAge = parseInt(hsts.value.match(/max-age=(\d+)/)[1], 10);
    assert.ok(maxAge >= 31536000, `HSTS max-age must be >= 1 year, got ${maxAge}`);
  });

  test("CSP blocks frame-ancestors", () => {
    const globalHeaders = config.headers.find(h => h.source === "/(.*)");
    const csp = globalHeaders.headers.find(h => h.key === "Content-Security-Policy");
    assert.ok(csp.value.includes("frame-ancestors 'none'"), "CSP must block framing");
  });

  test("API routes have no-store cache control", () => {
    const apiHeaders = config.headers.find(h => h.source === "/api/(.*)");
    assert.ok(apiHeaders, "must have API header rule");
    const cc = apiHeaders.headers.find(h => h.key === "Cache-Control");
    assert.equal(cc.value, "no-store");
  });

  test("llms.txt has proper content type header", () => {
    const llmsHeaders = config.headers.find(h => h.source === "/llms.txt");
    assert.ok(llmsHeaders, "must have llms.txt header rule");
    const ct = llmsHeaders.headers.find(h => h.key === "Content-Type");
    assert.ok(ct.value.includes("text/markdown"), "llms.txt must be served as text/markdown");
  });

  test("agent.json has CORS header for cross-origin agent discovery", () => {
    const agentHeaders = config.headers.find(h => h.source === "/.well-known/agent.json");
    assert.ok(agentHeaders, "must have agent.json header rule");
    const cors = agentHeaders.headers.find(h => h.key === "Access-Control-Allow-Origin");
    assert.ok(cors, "agent.json needs CORS for cross-origin agent discovery");
    assert.equal(cors.value, "*");
  });
});

// ─── INDEX.HTML STRUCTURE ───

describe("index.html meta and structured data", () => {
  let html;

  test("loads successfully", () => {
    html = readFile("index.html");
    assert.ok(html.length > 0);
  });

  test("has DOCTYPE", () => {
    assert.ok(html.trimStart().startsWith("<!DOCTYPE html>"), "must have DOCTYPE");
  });

  test("has lang attribute", () => {
    assert.ok(/html\s+lang="en"/.test(html), "must have lang=en");
  });

  test("has canonical URL pointing to clawfficer.com", () => {
    assert.ok(/rel="canonical"\s+href="https:\/\/clawfficer\.com\/"/.test(html),
      "must have canonical URL");
  });

  test("has meta description", () => {
    assert.ok(/name="description"\s+content=".{50,}"/.test(html),
      "must have substantial meta description");
  });

  test("has Open Graph title", () => {
    assert.ok(/property="og:title"\s+content="[^"]{10,}"/.test(html),
      "must have OG title");
  });

  test("has Open Graph description", () => {
    assert.ok(/property="og:description"\s+content="[^"]{20,}"/.test(html),
      "must have OG description");
  });

  test("has Twitter card tags", () => {
    assert.ok(/name="twitter:card"\s+content="summary_large_image"/.test(html),
      "must have twitter:card");
    assert.ok(/name="twitter:title"/.test(html), "must have twitter:title");
    assert.ok(/name="twitter:description"/.test(html), "must have twitter:description");
  });

  test("has robots meta allowing indexing", () => {
    assert.ok(/name="robots"\s+content="index,?\s*follow/.test(html),
      "must allow indexing");
  });

  test("has JSON-LD Organization block", () => {
    const jsonldBlocks = extractJsonLd(html);
    const org = jsonldBlocks.find(b => b["@type"] === "Organization");
    assert.ok(org, "must have Organization JSON-LD");
    assert.ok(org.name, "Organization must have name");
    assert.ok(org.url, "Organization must have url");
  });

  test("has JSON-LD SoftwareApplication block", () => {
    const jsonldBlocks = extractJsonLd(html);
    const app = jsonldBlocks.find(b => b["@type"] === "SoftwareApplication");
    assert.ok(app, "must have SoftwareApplication JSON-LD");
    assert.ok(app.name, "SoftwareApplication must have name");
    assert.ok(Array.isArray(app.offers), "must have offers array");
    assert.ok(app.offers.length >= 2, "must have at least 2 pricing tiers");
    assert.ok(Array.isArray(app.featureList), "must have featureList");
    assert.ok(app.featureList.length >= 5, "must list at least 5 features");
  });

  test("has JSON-LD FAQPage block", () => {
    const jsonldBlocks = extractJsonLd(html);
    const faq = jsonldBlocks.find(b => b["@type"] === "FAQPage");
    assert.ok(faq, "must have FAQPage JSON-LD");
    assert.ok(Array.isArray(faq.mainEntity), "FAQPage must have mainEntity array");
    assert.ok(faq.mainEntity.length >= 5, "must have at least 5 FAQ entries");
  });

  test("all JSON-LD blocks are valid JSON", () => {
    const blocks = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g) || [];
    assert.ok(blocks.length >= 3, "must have at least 3 JSON-LD blocks");
    for (const block of blocks) {
      const jsonStr = block
        .replace(/<script type="application\/ld\+json">\s*/, "")
        .replace(/\s*<\/script>/, "");
      assert.doesNotThrow(() => JSON.parse(jsonStr), `invalid JSON-LD: ${jsonStr.slice(0, 80)}...`);
    }
  });

  test("SoftwareApplication offers have transparent pricing (not Contact Sales)", () => {
    const jsonldBlocks = extractJsonLd(html);
    const app = jsonldBlocks.find(b => b["@type"] === "SoftwareApplication");
    for (const offer of app.offers) {
      assert.ok(offer.price !== undefined, `offer ${offer.name} must have explicit price`);
      assert.ok(offer.priceCurrency, `offer ${offer.name} must have currency`);
      const price = parseFloat(offer.price);
      assert.ok(!isNaN(price), `offer ${offer.name} price must be numeric`);
    }
  });

  test("Organization has sameAs links for entity resolution", () => {
    const jsonldBlocks = extractJsonLd(html);
    const org = jsonldBlocks.find(b => b["@type"] === "Organization");
    assert.ok(Array.isArray(org.sameAs), "Organization must have sameAs array");
    assert.ok(org.sameAs.length >= 2, "must have at least 2 sameAs links");
  });

  test("FAQPage answers are substantial (not one-liners)", () => {
    const jsonldBlocks = extractJsonLd(html);
    const faq = jsonldBlocks.find(b => b["@type"] === "FAQPage");
    for (const q of faq.mainEntity) {
      assert.ok(q.acceptedAnswer.text.length >= 80,
        `FAQ "${q.name}" answer is too short (${q.acceptedAnswer.text.length} chars)`);
    }
  });

  test("no broken internal anchor links", () => {
    const anchors = html.match(/href="#([^"]+)"/g) || [];
    for (const a of anchors) {
      const id = a.match(/href="#([^"]+)"/)[1];
      const hasTarget = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
      if (!hasTarget) {
        const sectionExists = html.includes(`id=${id}`) || id === "waitlist" || id === "how" || id === "features" || id === "compare" || id === "faq";
        assert.ok(sectionExists || hasTarget,
          `anchor #${id} has no matching element`);
      }
    }
  });

  test("form has required email field", () => {
    assert.ok(/type="email"/.test(html), "must have email input");
    assert.ok(/required/.test(html), "email should be required");
  });

  test("form posts to /api/subscribe", () => {
    assert.ok(/\/api\/subscribe/.test(html), "form must submit to /api/subscribe");
  });
});

// ─── SECURITY.TXT ───

describe("security.txt", () => {
  let content;

  test("loads and is not empty", () => {
    content = readFile(".well-known/security.txt");
    assert.ok(content.trim().length > 0);
  });

  test("has Contact field", () => {
    assert.ok(/^Contact:/m.test(content), "must have Contact field");
  });

  test("has Expires field", () => {
    assert.ok(/^Expires:/m.test(content), "must have Expires field");
  });

  test("Expires date is in the future", () => {
    const match = content.match(/^Expires:\s*(.+)$/m);
    assert.ok(match, "must have Expires with date");
    const expires = new Date(match[1]);
    assert.ok(expires > new Date(), `Expires date ${match[1]} is in the past`);
  });

  test("has Canonical field", () => {
    assert.ok(/^Canonical:/m.test(content), "must have Canonical field");
  });
});

// ─── .GITIGNORE ───

describe(".gitignore completeness", () => {
  let content;

  test("loads successfully", () => {
    content = readFile(".gitignore");
  });

  const mustIgnore = [
    ".env",
    "node_modules",
    ".DS_Store",
    ".vercel",
    "*.key",
    "*.pem",
  ];

  for (const pattern of mustIgnore) {
    test(`ignores ${pattern}`, () => {
      assert.ok(content.includes(pattern), `must ignore ${pattern}`);
    });
  }

  test("does NOT ignore essential project files", () => {
    assert.ok(!content.includes("index.html"), "must not ignore index.html");
    assert.ok(!content.includes("llms.txt"), "must not ignore llms.txt");
    assert.ok(!content.includes("api/"), "must not ignore api/");
  });
});

// ─── CROSS-FILE CONSISTENCY ───

describe("cross-file consistency", () => {
  test("canonical domain is consistent across all files", () => {
    const domain = "clawfficer.com";
    const filesToCheck = ["index.html", "llms.txt", "sitemap.xml", "robots.txt", ".well-known/agent.json"];
    for (const f of filesToCheck) {
      const content = readFile(f);
      assert.ok(content.includes(domain), `${f} must reference ${domain}`);
    }
  });

  test("sitemap URLs all exist as real files or known routes", () => {
    const sitemap = readFile("sitemap.xml");
    const locs = (sitemap.match(/<loc>(.*?)<\/loc>/g) || []).map(l => l.replace(/<\/?loc>/g, ""));
    for (const url of locs) {
      const pathname = new URL(url).pathname;
      if (pathname === "/") {
        assert.ok(fileExists("index.html"));
      } else {
        const rel = pathname.startsWith("/") ? pathname.slice(1) : pathname;
        assert.ok(fileExists(rel), `sitemap references ${pathname} but file ${rel} does not exist`);
      }
    }
  });

  test("robots.txt sitemap URL matches actual sitemap location", () => {
    const robots = readFile("robots.txt");
    const sitemapMatch = robots.match(/Sitemap:\s*(\S+)/);
    assert.ok(sitemapMatch, "robots.txt must reference sitemap");
    assert.ok(sitemapMatch[1].includes("clawfficer.com/sitemap.xml"));
    assert.ok(fileExists("sitemap.xml"));
  });

  test("agent.json skills reference capabilities mentioned in llms.txt", () => {
    const agent = JSON.parse(readFile(".well-known/agent.json"));
    const llms = readFile("llms.txt").toLowerCase();
    for (const skill of agent.skills) {
      const searchTerms = [
        ...skill.name.toLowerCase().split(/\s+/).filter(w => w.length > 3),
        ...skill.tags.map(t => t.toLowerCase()),
      ];
      const anyMatch = searchTerms.some(w => llms.includes(w));
      assert.ok(anyMatch,
        `agent.json skill "${skill.name}" (tags: ${skill.tags.join(", ")}) has no matching concept in llms.txt`);
    }
  });
});

// ─── HELPER ───

function extractJsonLd(html) {
  const blocks = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g) || [];
  return blocks.map(b => {
    const json = b.replace(/<script type="application\/ld\+json">\s*/, "").replace(/\s*<\/script>/, "");
    return JSON.parse(json);
  });
}
