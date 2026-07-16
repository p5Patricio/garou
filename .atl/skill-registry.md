# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| creating, opening, or preparing PRs for review. | branch-pr | C:\Users\Usuario\.gemini\config\skills\branch-pr\SKILL.md |
| PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | chained-pr | C:\Users\Usuario\.gemini\config\skills\chained-pr\SKILL.md |
| writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | cognitive-doc-design | C:\Users\Usuario\.gemini\config\skills\cognitive-doc-design\SKILL.md |
| PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | comment-writer | C:\Users\Usuario\.gemini\config\skills\comment-writer\SKILL.md |
| build web components, pages, artifacts, posters, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI. Create distinctive, production-grade frontend interfaces with high design quality. | frontend-design | C:\Users\Usuario\.gemini\config\skills\frontend-design\SKILL.md |
| Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | go-testing | C:\Users\Usuario\.gemini\config\skills\go-testing\SKILL.md |
| creating GitHub issues, bug reports, or feature requests. | issue-creation | C:\Users\Usuario\.gemini\config\skills\issue-creation\SKILL.md |
| judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | judgment-day | C:\Users\Usuario\.gemini\config\skills\judgment-day\SKILL.md |
| new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | skill-creator | C:\Users\Usuario\.gemini\config\skills\skill-creator\SKILL.md |
| implementation, commit splitting, chained PRs, or keeping tests and docs with code. | work-unit-commits | C:\Users\Usuario\.gemini\config\skills\work-unit-commits\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue — no exceptions.
- Every PR MUST have exactly one `type:*` label.
- Branch names MUST match regex: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`.
- Implement changes with conventional commits.
- Run shellcheck on modified scripts.

### chained-pr
- Split PRs over 400 changed lines unless maintainer explicitly accepts `size:exception`.
- Keep each PR reviewable in ≤60 minutes.
- Use one deliverable work unit per PR; keep tests/docs with the unit they verify.
- State start, end, prior dependencies, follow-up work, and out-of-scope items in every chained PR.
- Every child PR must include a dependency diagram marking current PR with `📍`.
- Feature Branch Chain: child #1 targets draft/no-merge tracker branch, subsequent children target immediate parent.

### cognitive-doc-design
- Lead with the answer: put the decision, action, or outcome first. Context comes after.
- Progressive disclosure: start with the happy path, then add details, edge cases, and references.
- Chunking: group related information into small sections; keep flat lists short.
- Signposting: use headings, labels, callouts, and summaries.
- Recognition over recall: prefer tables, checklists, examples, and templates over prose.
- Review empathy: design docs so reviewers can verify intent without reconstructing the whole story.

### comment-writer
- Be useful fast: start with actionable point; do not recap the whole PR before feedback.
- Be warm and direct: sound like a teammate, not a corporate bot; keep it short (1-3 paragraphs or tight bullet list).
- Match thread language: if writing in Spanish, use Rioplatense Spanish/voseo (`podés`, `tenés`, `fijate`, `dale`).
- No em dashes: use commas, periods, or parentheses instead.
- Use the Comment Formula: `<Direct request> \n\n <Why it matters> \n\n <Concrete next action>`.

### frontend-design
- No Generic AI Slop: never default to standard Inter-font, solid gradients, or generic 3-card layouts.
- Strict Accessibility (WCAG 2.1 AA): contrast ratio >= 4.5:1, visible focus states.
- CSS Variables: declare design tokens (colors, spacing, typography) as CSS variables in `index.css` or equivalent.
- Aesthetic Targets: Dark Mode uses deep grays, glow effects, glassmorphism, accent borders; Brutalist uses heavy borders, high contrast, retro-monospaced fonts.

### go-testing
- Prefer table-driven tests for multiple cases; use `t.Run(tt.name, ...)`.
- Test behavior and state transitions, not implementation details.
- Use `t.TempDir()` for filesystem tests.
- Keep integration tests skippable with `testing.Short()`.
- Bubbletea: test `Model.Update()` directly for state changes; use `teatest` only for interactive flows.

### issue-creation
- Blank issues are disabled; MUST use bug report or feature request template.
- Every issue gets `status:needs-review` automatically on creation.
- A maintainer MUST add `status:approved` before any PR can be opened.
- Questions go to Discussions, not issues.

### judgment-day
- Resolve project skills before launching agents: read skill registry, match compact rules, and inject Project Standards block.
- Launch two blind judges in parallel with identical target and criteria; never review code yourself.
- Classify warnings as `WARNING (real)` only if normal intended use can trigger them.
- Re-judge in parallel immediately after any fix; terminal states are only `APPROVED` or `ESCALATED`.

### skill-creator
- Follow `docs/skill-style-guide.md` as the normative source if available; otherwise use inline fallback rules.
- Skills are runtime instruction contracts for LLMs, not human docs.
- Do not add a `Keywords` section; preserve trigger words in description.
- Keep the skill body concise (max 700-1000 tokens).

### work-unit-commits
- Commit by work unit representing a deliverable behavior, fix, migration, or docs unit; do not commit by file type.
- Keep tests and docs with the code/behavior they verify or explain.
- If SDD tasks forecast a >400-line change, group commits into chained PR slices before implementation.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | c:\Users\Usuario\Documents\garou\AGENTS.md | Standalone file |
| CLAUDE.md | c:\Users\Usuario\Documents\garou\CLAUDE.md | Standalone file |

Read the convention files listed above for project-specific patterns and rules.
