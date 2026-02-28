# CEO Strategy & Build Roadmap

## Last Updated: 2026-02-27

---

## 1. Market Landscape

### The Acronym War (Feb 2026)

| Term | Full Name | What It Optimizes | Who's Pushing It |
|------|-----------|-------------------|------------------|
| **SEO** | Search Engine Optimization | Google rankings / clicks | Everyone (legacy) |
| **GEO** | Generative Engine Optimization | LLM citations in ChatGPT/Perplexity/Gemini | U of Toronto (arxiv), Forbes, a16z, SearchEngineLand |
| **AEO** | Answer Engine Optimization | Being the answer in AI search results | HubSpot, Neil Patel, Shopify, Conductor, aeoengine.ai |
| **AAO** | Assistive Agent Optimization | Being chosen when no human is in the loop | SearchEngineLand (published Feb 25, 2026) |
| **AIEO** | AI Engine Optimization | Being the recommendation | Emerging |
| **AEO** (variant) | Agent Engine Optimization | Agent-first product selection | scale.agency |
| **CEO** | Claw Engine Optimization | Being *called* by autonomous agents | **Us** |

### The Evolution Chain (per SearchEngineLand)
```
SEO → be found
AEO → be the answer
AIEO → be the recommendation
AAO → be chosen when no human is in the loop
CEO → be *integrated* when the agent acts (OUR POSITION)
```

### Key Stats
- AI-referred sessions up **527%** Jan–May 2025 (Previsible)
- **63%** of websites now get traffic from AI search (Ahrefs 2025)
- **64%** of customers ready to buy products suggested by AI (Master.of" Code)
- AI-driven traffic converts **9x** better than traditional search (Forbes)
- **80%** of consumers use zero-click results in 40%+ of searches (Bain)
- ChatGPT surpassed Bing in daily query volume in 2024
- **Over 60%** of searches now end without a click (Ahrefs)
- By 2028, AI search traffic may eclipse traditional search

### The Algorithmic Trinity (SearchEngineLand framework)
Every AI system that makes recommendations runs on three components:
1. **Large Language Models** — generative reasoning
2. **Knowledge Graphs** — structured entity relationships
3. **Traditional Search** — indexed web content

GEO covers #1. Entity SEO covers #2. Regular SEO covers #3. **None of them cover the protocol/integration layer where agents actually act.**

---

## 2. CEO's Unique Position

### The Gap Nobody Is Filling

Every existing term (GEO, AEO, AAO) optimizes the **content layer** — making sure an AI *mentions* your brand when a human asks a question.

CEO optimizes the **protocol layer** — making sure an autonomous agent *discovers, integrates, and calls* your product when it needs to act.

**Content layer** = passive citation ("ChatGPT mentioned us!")
**Protocol layer** = active integration ("An agent booked through our API!")

### The One-Liner
> "GEO optimizes what agents say about you. CEO optimizes what agents DO with you."

### Why This Matters Now
- MCP (Model Context Protocol) is now under the Linux Foundation's AAIF, co-founded by Anthropic, Block, and OpenAI
- MCP supports **dynamic discovery of tools** — agents auto-detect available servers and actions
- ClawHub already has 3,286+ agent skills with vector search discovery
- The agent-to-agent (A2A) protocol is emerging for autonomous agent collaboration
- `llms.txt` is becoming standard for machine-readable product descriptions
- arxiv paper (Feb 2026): "Agent Skills attempt to complement MCP by progressive discovery of capabilities"

### The Analogy
```
ClawHub : open-source agent skills = CEO : commercial products/APIs
npm : packages                     = CEO : products in the agentic web
```

---

## 3. Website Assessment

### What's Strong
- Visual design is excellent (clean, professional, the terminal animation is killer)
- CEO Score concept is compelling and differentiated
- llms.txt / Capability Manifest / Trust Proof — all real, protocol-level concepts
- Compare table vs SEO/GEO tools is the right competitive frame
- "Audit. Optimize. Publish." is clear and actionable

### What Needs Changing

#### A. Sharpen the hero copy
Current: "Make your product native to the agentic web"
Problem: Too vague. Doesn't differentiate from GEO/AEO.
**Proposed:** "GEO gets you mentioned. CEO gets you called." or "Agents don't click links. They call APIs. Be the one they call."

#### B. Add a "Why Not GEO/AEO?" section
The site compares CEO vs "SEO/GEO Tools" in the table, but doesn't explain *why* they're different categories. Need a short, sharp section that says:
- GEO/AEO = content optimization for AI citations (passive)
- CEO = protocol optimization for agent integration (active)
- They're complementary, not competitive — but only one generates direct agent-driven transactions

#### C. Add the market context
People landing on this site need to understand the landscape. A brief "The evolution of search optimization" section showing SEO → GEO → AEO → CEO would educate and position simultaneously.

#### D. Make the waitlist form actually work
Currently it's a frontend-only form that hides and shows a success message. Needs a real backend (even just a Vercel serverless function → Google Sheet or Supabase).

#### E. Add social proof / urgency signals
- "X agents indexed this week"
- "Y companies in early access"
- Real logos if any exist

#### F. The "Claw Engine" framing
The site references the "Claw Engine" as if it already exists. This is fine for a landing page, but the build roadmap needs to clarify what's real vs. aspirational.

---

## 4. Build Roadmap (Priority Order)

### Phase 1: Foundation (Week 1-2)
**Goal: Make CEO real enough to demo**

1. **`ceo-scanner` CLI / ClawHub skill**
   - Input: URL
   - Checks: llms.txt presence, schema.org markup, API documentation, MCP server availability, OpenAPI spec
   - Output: CEO Score (0-100) with breakdown
   - Publish to ClawHub immediately — install counts = demand signal
   - This is the `claw scan --url` from the site, made real

2. **`llms.txt` generator**
   - Input: URL + optional API docs
   - Crawls site, extracts product info, pricing, capabilities
   - Outputs compliant llms.txt file
   - This is the `claw optimize` from the site

3. **Waitlist backend**
   - Vercel serverless function
   - Stores to Supabase or Google Sheets
   - Triggers email with CEO Score within 48h (can be manual initially)

### Phase 2: Website Polish (Week 2)
**Goal: Sharpen positioning based on research**

4. **Update hero copy** — "GEO gets you mentioned. CEO gets you called."
5. **Add "Evolution" section** — SEO → GEO/AEO → CEO visual
6. **Add "Why Not Just GEO?" section** — content vs protocol layer explanation
7. **Wire up waitlist form** to real backend
8. **Add /blog** — for SEO (ironic) and thought leadership

### Phase 3: Content & Distribution (Week 3-4)
**Goal: Enter the discourse**

9. **Launch X thread**
   - Hook: "Everyone's arguing GEO vs AEO vs AAO. They're all optimizing the wrong layer."
   - Thread: Explain content layer vs protocol layer distinction
   - CTA: Link to clawfficer.com
   - Timing: The discourse is peak right now

10. **Publish on ClawHub blog / OpenClaw community**
    - "CEO: Why Agent Discovery Is Not the Same as AI Citations"
    - Cross-post to dev.to, Hacker News

11. **llms.txt for CEO itself**
    - Eat your own dogfood
    - Put llms.txt on clawfficer.com
    - Show the CEO Score for clawfficer.com on the site (meta flex)

### Phase 4: Product (Month 2)
**Goal: Build the actual platform**

12. **CEO Dashboard (web app)**
    - Sign in → add your product URL
    - See CEO Score + breakdown
    - Auto-generated llms.txt + capability manifest
    - Track agent discovery analytics (even if simulated initially)

13. **Claw Engine Registry (MVP)**
    - Indexed database of CEO-optimized products
    - Queryable by OpenClaw agents via MCP server or API
    - Basically ClawHub but for commercial products instead of skills

14. **MCP Server scaffolding tool**
    - Input: OpenAPI spec or product URL
    - Output: Working MCP server that exposes your product to agents
    - This is the killer feature nobody else has

15. **A2A endpoint wrapper**
    - Takes existing REST APIs
    - Wraps them in A2A-compatible format
    - Agents can call them natively

### Phase 5: Monetization (Month 3+)
**Goal: Revenue**

16. **Freemium model**
    - Free: CEO Score scan, basic llms.txt generation
    - Pro ($49/mo): Dashboard, analytics, auto-sync, registry listing
    - Enterprise ($299/mo): Priority ranking, competitive intelligence, custom MCP server, dedicated support

17. **Agency/consultant play**
    - "CEO Certified" program
    - Train agencies to do CEO optimization for clients
    - Revenue share on referrals

---

## 5. X/Twitter Content Strategy

### Thread Ideas (ranked by urgency)

1. **"The Wrong Layer"** (launch thread)
   > "Everyone's arguing GEO vs AEO vs AAO. They're all optimizing the same layer — getting AI to *mention* you. Nobody's optimizing the layer that matters: getting AI to *call* you."

2. **"The Agent Funnel Is Dead"**
   > "Bain says 80% of consumers use zero-click results. But that's still a human reading an AI answer. The next shift: agents that act without showing the human anything. Your product needs to be callable, not citable."

3. **"I Scanned 100 SaaS Products for Agent-Readiness"**
   > Run the CEO scanner on 100 popular SaaS tools. Share results. Most will score terribly. Great content.

4. **"llms.txt Is the New robots.txt"**
   > Explain what it is, why every product needs one, how to generate it.

5. **"MCP Is the New SEO"**
   > Model Context Protocol is how agents discover tools. If your product doesn't have an MCP server, you're invisible to the agentic web.

### Accounts to Engage
- @aiwithjainam (viral GEO thread)
- @lennysan (Lenny Rachitsky, prefers AEO)
- @michaelmiraflor (marketing exec, watching GEO vs AEO)
- @sarah_schupp (posted about GEO/AEO/GSO distinction)
- SearchEngineLand authors (AAO article)
- OpenClaw / ClawHub community

---

## 6. Competitive Moat

### Why CEO Wins Long-Term

1. **Protocol > Content** — Content optimization is a race to the bottom (everyone can write good llms.txt). Protocol integration (MCP servers, A2A endpoints, capability manifests) is technical and defensible.

2. **Registry network effects** — The more products in the Claw Engine registry, the more agents query it, the more products want to be listed. Classic marketplace flywheel.

3. **ClawHub ecosystem** — CEO can leverage the existing 3,286+ skill ecosystem and 220k-star OpenClaw community for distribution.

4. **First-mover on the protocol layer** — Everyone else is fighting over GEO/AEO. Nobody is building the agent integration platform.

5. **The "Claw" brand** — Tied to OpenClaw, the dominant open-source agent framework. Credibility built in.

---

## 7. Risks

1. **"Claw Engine" doesn't exist yet** — The site implies a real registry. Need to build MVP fast or risk credibility.
2. **Naming confusion** — "CEO" has obvious collision with Chief Executive Officer. Could be a feature (memorable, searchable) or a bug (hard to SEO for, ironic given the product).
3. **OpenClaw dependency** — If CEO is too tightly coupled to OpenClaw, it limits TAM. Should work with any agent framework.
4. **Market timing** — Agents acting autonomously (buying, booking) is still early. Most "agent" use cases are still human-in-the-loop. CEO is a bet on the near future.

---

## 8. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-27 | Position CEO as protocol-layer, not content-layer | Differentiate from GEO/AEO/AAO crowd |
| 2026-02-27 | Build ceo-scanner CLI first | Fastest path to real product + ClawHub distribution |
| 2026-02-27 | Deploy site to clawfficer.com on Vercel | Live and public |
| 2026-02-27 | Target X launch thread within 1 week | Discourse is peak right now |

---

*This document is the source of truth for CEO strategy. Update it as decisions are made.*
