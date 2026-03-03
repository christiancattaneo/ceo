import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function expectIncludes(content, needle, label) {
  assert.ok(content.includes(needle), `missing ${label}: ${needle}`);
}

describe("campaign page metadata integrity", () => {
  test("main page has canonical + social + schema markers", () => {
    const html = read("index.html");
    expectIncludes(html, '<link rel="canonical" href="https://clawfficer.com/">', "canonical");
    expectIncludes(html, 'property="og:url" content="https://clawfficer.com/"', "og:url");
    expectIncludes(html, 'name="twitter:card" content="summary_large_image"', "twitter card");
    expectIncludes(html, '"@type": "SoftwareApplication"', "software schema");
    expectIncludes(html, '"@type": "FAQPage"', "faq schema");
  });

  test("clawhub page metadata is self-canonicalized", () => {
    const html = read("clawhub/index.html");
    expectIncludes(html, '<link rel="canonical" href="https://clawfficer.com/clawhub/">', "clawhub canonical");
    expectIncludes(html, 'property="og:url" content="https://clawfficer.com/clawhub/"', "clawhub og:url");
    expectIncludes(html, 'name="twitter:card" content="summary_large_image"', "clawhub twitter card");
  });

  test("x page metadata is self-canonicalized", () => {
    const html = read("x/index.html");
    expectIncludes(html, '<link rel="canonical" href="https://clawfficer.com/x/">', "x canonical");
    expectIncludes(html, 'property="og:url" content="https://clawfficer.com/x/"', "x og:url");
    expectIncludes(html, 'name="twitter:card" content="summary_large_image"', "x twitter card");
  });
});

describe("sitemap and crawler assets", () => {
  test("sitemap includes critical campaign URLs", () => {
    const xml = read("sitemap.xml");
    const mustHave = [
      "https://clawfficer.com/",
      "https://clawfficer.com/llms.txt",
      "https://clawfficer.com/llms-full.txt",
      "https://clawfficer.com/clawhub/",
      "https://clawfficer.com/x/",
    ];
    for (const loc of mustHave) {
      expectIncludes(xml, `<loc>${loc}</loc>`, `sitemap loc ${loc}`);
    }
  });

  test("robots file declares sitemap", () => {
    const robots = read("robots.txt");
    expectIncludes(robots, "User-agent: *", "robots user agent");
    expectIncludes(robots, "Sitemap: https://clawfficer.com/sitemap.xml", "robots sitemap");
  });
});
