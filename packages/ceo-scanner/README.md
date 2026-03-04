# ceo-scanner

Scan any URL for **CEO (Claw Engine Optimization)** readiness -- how discoverable, integrable, and transactable your product is for autonomous AI agents.

## What is CEO?

CEO = **Claw Engine Optimization**. Like SEO is for search engines, CEO is for AI agents. It measures whether your product exposes the signals that autonomous agents need to discover, understand, and transact with your service.

## Install

```bash
npm install -g ceo-scanner
```

Or run directly:

```bash
npx ceo-scanner https://example.com
```

## Usage

```bash
ceo-scanner <url>

# Examples
ceo-scanner https://stripe.com
ceo-scanner example.com          # https:// added automatically
ceo-scanner https://api.openai.com --json
ceo-scanner https://example.com --html report.html
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output full results as JSON |
| `--html [file]` | Generate standalone HTML report (default: ceo-report.html) |
| `--no-color` | Disable colored output |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Checks (9 total)

### Discovery

| Check | Weight | What it scores |
|-------|--------|----------------|
| **llms.txt** | 15 | Existence, title, capabilities, pricing, API links, llms-full.txt, size, format |
| **Structured data** | 10 | JSON-LD presence, @type relevance, name/description, offers, provider, features |
| **Registry** | 10 | Presence on ClawHub, Smithery, npm |

### Integration

| Check | Weight | What it scores |
|-------|--------|----------------|
| **MCP endpoint** | 15 | /.well-known/mcp.json, structure, tool descriptions, auth, HTML link, transport |
| **A2A endpoint** | 10 | /.well-known/agent.json, name/desc, capabilities, auth, endpoint, spec conformance |
| **OpenAPI** | 10 | Spec at standard paths, version, descriptions, schemas, auth, examples |
| **Performance** | 10 | Response time, HTTP status, CORS, cache headers, content-type, response size |

### Transaction

| Check | Weight | What it scores |
|-------|--------|----------------|
| **Payment ready** | 10 | Stripe detection, pricing page, API pricing language, structured pricing data |
| **Trust signals** | 10 | HTTPS, security.txt, CORS, rate-limit headers, auth docs, CSP |

## Scoring

Each check returns a score from 0-100 with granular sub-metrics. The final score is a weighted average across all checks.

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A+ | Fully CEO-optimized |
| 80-89 | A | Excellent |
| 70-79 | B | Good foundation |
| 50-69 | C | Partial -- significant gaps |
| 30-49 | D | Minimal AI agent support |
| 0-29 | F | Not optimized for AI agents |

## Example Output

```
CEO Score: 73/100 (B) for https://example.com

  DISCOVERY (22/35)
    [ok] llms.txt         78/100 -- found, well-structured
    [ok] Structured data  65/100 -- JSON-LD present (SoftwareApplication)
    [--] Registry          0/100 -- not found on ClawHub, Smithery, or npm

  INTEGRATION (33/45)
    [ok] MCP endpoint     80/100 -- found at /.well-known/mcp.json
    [ok] A2A endpoint     60/100 -- found but missing capabilities
    [ok] OpenAPI          45/100 -- found, missing examples
    [--] Performance      72/100 -- 340ms, missing CORS

  TRANSACTION (8/20)
    [ok] Payment ready    40/100 -- pricing page found
    [--] Trust signals    20/100 -- HTTPS only

  Recommendations:
    * Add capabilities to /.well-known/agent.json
    * List on ClawHub -- run: clawhub publish
    * Add /.well-known/security.txt
    * Add rate-limit headers to API responses
    * Add example values to OpenAPI schemas
```

## API

The scanner is also available as a library:

```typescript
import { scan } from 'ceo-scanner';

const result = await scan('https://example.com');
console.log(result.score);  // 0-100
console.log(result.grade);  // 'A+' through 'F'
console.log(result.categories.discovery.checks);
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Score >= 50 |
| `1` | Score < 50 |
| `2` | Fatal error |

## Development

```bash
git clone https://github.com/christiancattaneo/ceo.git
cd ceo/packages/ceo-scanner
npm install
npm run build
npm test
node dist/index.js https://example.com
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Zero runtime dependencies beyond chalk + commander

## License

MIT
