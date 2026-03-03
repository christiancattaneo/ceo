# ceo-scanner

Scan any website for **CEO (Claw Engine Optimization)** readiness — how well a product is optimized for autonomous AI agents.

## What is CEO?

CEO = **Claw Engine Optimization**. Like SEO is for search engines, CEO is for AI agents. It measures whether your product exposes the signals that autonomous agents need to discover, understand, and interact with your service.

## Install

```bash
npm install -g ceo-scanner
```

## Usage

```bash
ceo-scanner <url>

# Examples
ceo-scanner https://maxxer.ai
ceo-scanner example.com          # https:// added automatically
ceo-scanner https://api.stripe.com --json
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON |
| `--no-color` | Disable colored output |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Checks

| Check | Weight | What it looks for |
|-------|--------|-------------------|
| **llms.txt** | 20 | `/llms.txt` at the domain root — a plain-text file describing the product for LLM consumption |
| **MCP endpoint** | 20 | `/.well-known/mcp.json` or `<link rel="mcp">` in HTML — advertises a Model Context Protocol server |
| **A2A endpoint** | 20 | `/.well-known/agent.json` — Agent-to-Agent protocol discovery |
| **OpenAPI** | 10 | OpenAPI/Swagger spec at common paths (`/openapi.json`, `/swagger.json`, `/api-docs`, etc.) |
| **Structured data** | 10 | JSON-LD `<script type="application/ld+json">` blocks on the homepage |
| **Performance** | 20 | Homepage response time — AI agents need fast responses (<2s) |

## Score Breakdown

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A+ | Fully CEO-optimized |
| 80-89 | A | Excellent — minor improvements possible |
| 70-79 | B | Good foundation, missing some signals |
| 50-69 | C | Partial — significant gaps |
| 30-49 | D | Minimal AI agent support |
| 0-29 | F | Not optimized for AI agents |

## Example Output

```
CEO Score: 72/100 (B) for https://maxxer.ai

  ✅ llms.txt        found — "Maxxer AI Growth Platform"
  ❌ MCP endpoint    not found
  ❌ A2A endpoint    not found
  ✅ OpenAPI         found at /openapi.json
  ✅ Structured data JSON-LD present (SoftwareApplication)
  ✅ Performance     842ms (fast)

Recommendations:
  • Add /.well-known/mcp.json to advertise your MCP server
  • Add /.well-known/agent.json for A2A discoverability
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Score ≥ 50 |
| `1` | Score < 50 |
| `2` | Fatal error (DNS failure, invalid URL, etc.) |

## Requirements

- Node.js 18+ (uses native `fetch`)

## Development

```bash
git clone https://github.com/christiancattaneo/ceo.git
cd ceo/packages/ceo-scanner
npm install
npm run build
node dist/index.js https://example.com
```

## License

MIT
