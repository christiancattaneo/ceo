# OpenClaw SEO GEO playbook

This is the practical stack for ranking in search, getting cited by LLMs, and getting selected by OpenClaw agents.

## Objective model

Think in three layers.

- **SEO layer**: crawl, index, canonical correctness
- **GEO layer**: crisp answers and sourceable claims for model citations
- **agent layer**: explicit capabilities and safe endpoints for agent execution

Do not optimize one layer and assume the others are solved.

## Technical baseline

Ship these files at domain root.

- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `.well-known/security.txt`

Ship these tags on the landing page.

- canonical URL
- Open Graph tags
- X card tags
- SoftwareApplication JSON-LD
- FAQPage JSON-LD with real on-page FAQs

## GEO content shape for agents

Use an answer-first structure.

- first paragraph: **what**, **for who**, **why now** in 40 to 80 words
- section headings phrased as user intent questions
- one capability per subsection with call semantics
- include constraints and failure modes

Write claims so a model can safely quote them.

- include concrete nouns and protocol names
- avoid vague superlatives
- prefer verifiable statements tied to URLs

## OpenClaw and ClawHub optimization

Treat agent registries like high intent search surfaces.

- keep capability names stable across site, llms docs, and registry entries
- map each capability to explicit input, output, auth, and cost semantics
- expose minimal safe endpoints before broad endpoint surface
- keep one canonical URL for each capability description

## X distribution system

Use X for demand capture and language priming.

- post one core thesis repeatedly with fresh proof
- link to one canonical landing URL per campaign
- use `summary_large_image` cards and clear, concise copy
- pair every thread with one artifact: benchmark, scan result, or teardown

Suggested posting cadence.

- 3 short posts per week
- 1 deep thread per week
- 1 proof artifact per week

## Measurement model

Track separated outcomes by layer.

- SEO: indexed pages, crawl errors, branded and non-branded clicks
- GEO: model mentions, citation share in top prompts, referral sessions from AI sources
- agent: discovery events, call attempts, call success rate, action conversion rate

North star is **agent-initiated successful actions**, not impressions.

## Security for agent-callable surfaces

- strict origin allowlists for browser-originated flows
- rate limits by IP and by identity surface
- input validation and output encoding
- explicit timeouts and error handling on third-party dependencies
- publish security contact in `security.txt`
