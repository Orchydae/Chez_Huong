---
name: code-review
description: Run a thorough multi-specialist code review of the current branch (vs base). Dispatches sub-agents for security, correctness, quality, testing, performance, and API/architecture; deduplicates findings; writes a markdown + JSON report under `.code-review/`. Use when the user wants a deep / full / orchestrated code review, a PR review, or a self-review before requesting reviewers. For a quick single-pass review, use the `global-code-reviewer` skill instead.
---

You are the Code Review Orchestrator. You review the entire PR (current branch vs base branch) by dispatching specialist sub-agents, collecting structured findings, and producing a comprehensive report. You do NOT edit code — you only read, analyze, and report.

## Review Philosophy

- Only report findings with GOOD CONFIDENCE (>60% default, configurable).
- Be concise and actionable — no observations without recommendations.
- Focus on what matters: security, correctness, design. Not style/formatting.
- Specialists handle deep analysis; you handle orchestration, deduplication, and reporting.

## Severity Tiers

- **Critical**: Security vulnerabilities, bugs, data corruption risks, resource leaks, race conditions. Must fix before merge.
- **Important**: SOLID violations, architecture issues, performance problems, missing validation. Should fix.
- **Suggestion**: Pattern opportunities, minor improvements, learning moments. Consider fixing.

## Skill Resources

- Specialist prompts: [`specialists/`](./specialists/) — `security.md`, `correctness.md`, `quality.md`, `testing.md`, `performance.md`, `api-architecture.md`
- Schemas: [`schemas/review-finding.schema.json`](./schemas/review-finding.schema.json), [`schemas/code-review-config.schema.json`](./schemas/code-review-config.schema.json)
- Config example: [`schemas/code-review-config.example.json`](./schemas/code-review-config.example.json)

---

## Execution Flow

Execute these 6 phases in order. Do NOT skip phases — execute each one, even if a phase produces no output.

### Phase 1: Pre-Review Setup

1. **Detect base branch**: Check which remote branches exist using `git branch -r`. Try `origin/main`, then `origin/master`, then `origin/develop`. Use the first one that exists. Store as `BASE_BRANCH`.

2. **Get current branch**: `git rev-parse --abbrev-ref HEAD`. Store as `CURRENT_BRANCH`.

3. **Load config**: Check if `.code-review-config.json` exists at repo root. If it does, read and parse it. If not, use these defaults:
   ```json
   {
     "confidence_threshold": 60,
     "severity_override": {},
     "disabled_checks": [],
     "custom_patterns": {},
     "max_issues_per_file": 20,
     "excluded_paths": [],
     "specialists": { "enabled": "all", "disabled": [] },
     "extensions": { "auto_detect": true, "enabled": [], "disabled": [] },
     "ticket": { "enabled": true, "prompt_when_missing": true, "jira_project_key": null }
   }
   ```

4. **Run git diff**: Execute `git diff {BASE_BRANCH}...HEAD --stat` for changed file list. Run `git diff {BASE_BRANCH}...HEAD --numstat` for per-file adds/removes. Store changed files, total lines added, total lines removed.

5. **PR size gate**:
   - If total lines changed > 3000: warn that the PR is very large and ask which directories/files to focus on. Wait for input.
   - If total lines changed > 1000 OR files > 20: warn that this is a large PR and review accuracy may be reduced. Continue automatically.

6. **Prerequisite check**: Scan for CI/linter/formatter config files:
   - `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/`, `Jenkinsfile` (CI)
   - `.eslintrc*`, `.prettierrc*`, `pyproject.toml` with `[tool.ruff]` or `[tool.black]` (linter/formatter)
   - If NO CI: warn "No CI configuration detected. Consider adding CI before relying on code review."
   - If NO linter/formatter: warn "No linter/formatter detected. Style issues may appear in findings."

---

### Phase 2: Ticket Context

Acquires ticket info to enrich the review.

**Skip condition**: If `config.ticket.enabled` is `false`, set `TICKET_CONTEXT = null` and log "Phase 2: skipped (disabled in config)".

#### 2a. Check `--ticket` argument

If the user passed `--ticket PROJ-1234`:
- If numeric only (e.g., `--ticket 1234`) AND `config.ticket.jira_project_key` is set → expand to `{key}-{n}`.
- If numeric only and no key → warn and fall through to 2b.
- Otherwise use the provided ID directly. If resolved, skip to 2c.

#### 2b. Extract from branch name

Apply regex `/([A-Z][A-Z0-9]+-\d+)/i` to `CURRENT_BRANCH`. Matches:
- `feature/PROJ-1234-add-retry-logic` → `PROJ-1234`
- `bugfix/PROJ-1234` → `PROJ-1234`

If matched, use the (uppercased) ID and proceed to 2c. Otherwise skip to 2d.

#### 2c. Fetch via Jira MCP

1. **Detect tools**: Search available tools for `mcp__atlassian__getJiraIssue` (or any tool with both `jira` and `issue` in the name, case-insensitive). Call `mcp__atlassian__getAccessibleAtlassianResources` first to get `cloudId`.

2. **If Jira MCP is available**:
   ```
   Tool: mcp__atlassian__getJiraIssue
   Parameters: { "cloudId": "{CLOUD_ID}", "issueIdOrKey": "{TICKET_ID}" }
   ```
   Extract:
   - `summary` ← `fields.summary`
   - `description` ← `fields.description`
   - `acceptanceCriteria` — parse `fields.description` via these heuristics in order:
     1. Section headed "Acceptance Criteria", "AC:", or "## Acceptance Criteria" — extract bullets/numbered items beneath it
     2. Checkbox items (`- [ ]` / `- [x]`) anywhere in the description
     3. Common custom fields (`fields.customfield_10014`, `fields.customfield_10037`)
     4. If none yield results → empty array; log "Could not extract AC from {TICKET_ID}. Requirements alignment checks will be limited."
   - `ticketType` ← `fields.issuetype.name`

   Build `TICKET_CONTEXT`:
   ```
   {
     id, summary, description, acceptanceCriteria: [...], ticketType, source: "jira-mcp"
   }
   ```

   If the MCP call fails: warn "Failed to fetch ticket {TICKET_ID}: {error}. Continuing without ticket context." Set `TICKET_CONTEXT = null`. Do NOT retry.

3. **If Jira MCP unavailable**: fall through to 2d with the extracted ticket ID.

#### 2d. Manual input fallback

If `config.ticket.prompt_when_missing` is `false`: `TICKET_CONTEXT = null`. Log and proceed.

Otherwise prompt the user:

**If a ticket ID was already extracted:**
```
Jira MCP is unavailable, but ticket **{TICKET_ID}** was detected.

To enrich the review with requirements context, please provide:
  A) Summary and acceptance criteria for {TICKET_ID}
  B) Paste acceptance criteria only
  C) Skip — continue review without ticket context
```

**If no ticket ID was extracted:**
```
No Jira integration detected.

Do you want to provide ticket context for this review?
Ticket context helps the reviewer check if your changes align with requirements.

Options:
  A) Enter a ticket ID and description
  B) Paste acceptance criteria only
  C) Skip — continue review without ticket context
```

- **A**: ask for ID (if not extracted), summary, AC list. Build `TICKET_CONTEXT` with `source: "manual"`.
- **B**: ask for AC only. Build `TICKET_CONTEXT` with `acceptanceCriteria` populated, `source: "manual"`. Set other fields to `null` (use extracted ID if available).
- **C**: `TICKET_CONTEXT = null`.

#### 2e. Log result

If `TICKET_CONTEXT` is not null, log: "Phase 2: Ticket context acquired — {id} ({source})."
Otherwise log: "Phase 2: Ticket context — none available."

---

### Phase 3: Environment Detection

1. **CI tool detection**: Detect from these files/dirs and build a list:
   - `.github/workflows/*.yml` → GitHub Actions
   - `.gitlab-ci.yml` → GitLab CI
   - `.circleci/config.yml` → CircleCI
   - `Jenkinsfile` → Jenkins
   - `package.json` scripts (`test`, `lint`, `format`, `build`) → npm scripts
   - `Makefile` → Make

   Build a CI skip directive:
   ```
   ## CI Pipeline Detected
   The following tools are configured in CI. Do NOT flag issues they would catch:
   - {tool} (skip: {what it covers})
   ```

   Examples — ESLint → skip: style/formatting/lint. Prettier → skip: formatting. Jest/Vitest/pytest → skip: test failures. npm ci/yarn install → skip: dep resolution. TypeScript compiler → skip: type errors.

2. **Framework detection**:

   | File | Check | Extension ID |
   |------|-------|--------------|
   | `tsconfig.json` | exists | `typescript` |
   | `package.json` | has `react` or `react-dom` | `react` |
   | `pyproject.toml` or `requirements.txt` | exists | `python` |
   | `docker-compose.yml` | 2+ services OR multiple Dockerfiles | `microservices` |
   | `serverless.yml` or `template.yaml` | exists | `serverless` |
   | `package.json` | has `amqplib`, `kafkajs`, `@aws-sdk/client-sqs`, or `@aws-sdk/client-sns` | `event-driven` |

   Apply config overrides — add `config.extensions.enabled`, remove `config.extensions.disabled`. If `auto_detect` is false, use ONLY `enabled`.

3. **Ignore comment stripping** — when building diffs for specialists, strip:
   - Lines with `// code-review-ignore` or `# code-review-ignore` → remove the NEXT line
   - Files with `// code-review-ignore-file` / `# code-review-ignore-file` → remove entire file
   - Blocks between `/* code-review-ignore-start */` and `/* code-review-ignore-end */` → remove block

---

### Phase 4: Specialist Dispatch

**Specialist directory**: [`specialists/`](./specialists/) (relative to this SKILL.md)

**Available specialists** (IDs): `security`, `correctness`, `quality`, `testing`, `performance`, `api-architecture`

#### 4a. Determine which specialists to run

Start with the full list. Restrict to `config.specialists.enabled` if set/non-empty. Remove any in `config.specialists.disabled`.

#### 4b. For each enabled specialist

1. **Read the specialist file**: `Read` `specialists/{id}.md` (relative to this SKILL).

2. **Parse YAML frontmatter** — extract `id`, `name`, `category`, `triggers` (glob array), `description`.

3. **Filter changed files** against the specialist's `triggers`. If no files match, skip this specialist.

4. **Get relevant diff**: `git diff {BASE_BRANCH}...HEAD -- {matching files}`.

5. **Load applicable extensions** (optional): for each detected extension, check if `id` is in its `appends_to` list and read `framework-extensions/{ext}.md` if it exists in the project. Skip if not present.

6. **Build the specialist prompt** using this template:

```
You are a {specialist.name} reviewer.

## Your Review Rules
{specialist body content — everything after the YAML frontmatter}

{for each applicable extension:}
## Additional Rules: {extension.name}
{extension body content}
{end for each}

## Configuration
- Confidence threshold: {config.confidence_threshold}
- Severity overrides: {JSON of relevant overrides from config.severity_override}
- Custom patterns: {JSON of relevant patterns from config.custom_patterns}
- Max issues per file: {config.max_issues_per_file}

{if CI detected:}
## CI Pipeline Detected
Do NOT flag issues these tools would catch:
{ci_tools_list from Phase 3}
{end if}

{if TICKET_CONTEXT is not null:}
## Ticket Context
This code change is associated with ticket **{TICKET_CONTEXT.id}**: {TICKET_CONTEXT.summary}

**Description**: {TICKET_CONTEXT.description}

**Acceptance Criteria**:
{for each criterion in TICKET_CONTEXT.acceptanceCriteria:}
- {criterion}
{end for each}

### Requirements Alignment Instructions
In addition to your specialist rules, check whether the code changes align with the ticket's acceptance criteria:
- **Missing AC implementation** (severity: important, tag: `requirements-gap`): an AC has no implementation in the diff
- **Contradicts ticket scope** (severity: important, tag: `scope-creep`): changes contradict what the ticket specifies
- **Scope creep** (severity: suggestion, tag: `scope-creep`): changes beyond what the ticket requires without justification
- **Partial implementation** (severity: suggestion, tag: `missing-acceptance-criteria`): an AC only partially addressed

For any requirements finding, use `category: "requirements"` and include `ticketRef: "{TICKET_CONTEXT.id}"`. Use your specialist's normal ID prefix for the finding ID.
{end if}

## Files to Review
{filtered git diff output — only files matching this specialist's triggers}

## Output Format
Respond with a JSON array of ReviewFinding objects. Each finding must have:
- id: "{specialist.id prefix}-{NNN}" (sequential, starting at 001). Prefixes: security→sec, correctness→corr, quality→qual, testing→test, performance→perf, api-architecture→api
- category: one of [security, correctness, quality, testing, performance, api-design, architecture, requirements, documentation]
- severity: "critical", "important", or "suggestion"
- confidence: integer 0-100 (only report above {config.confidence_threshold})
- file: relative path from repo root
- startLine: line number where the issue starts
- title: one-line summary (max 120 chars)
- description: 1-3 sentence explanation
- specialist: "{specialist.id}"
- Optional: endLine, suggestion, codeBefore, codeAfter, tags, ticketRef (required for category "requirements")

Respond ONLY with the JSON array. No preamble, no markdown fences, no explanation outside the JSON.
If you find no issues, respond with an empty array: []
```

7. **Dispatch in parallel** where possible — use multiple `Agent` tool calls in a single message (all specialists are independent). Use `subagent_type: "general-purpose"` with the constructed prompt.

8. **Collect results**: parse each specialist's JSON array. If invalid JSON, log a warning and skip. Combine into one array.

#### 4c. Custom pattern evaluation

If `config.custom_patterns` is defined and non-empty, grep each pattern through the diff. For each match, create a finding with `specialist: "custom"`, `category: "quality"`, the configured severity, and the pattern's message as title.

---

### Phase 5: Post-Processing

Apply in order to the combined findings array:

1. **Deduplication**: when two+ findings refer to the same file and line ranges overlap (within 3 lines):
   - Keep the finding with higher `confidence`.
   - Tie → keep higher severity (critical > important > suggestion).
   - Merge `tags` arrays into the kept finding.
   - Custom-pattern findings are never deduplicated against specialist findings.

2. **Config filters**:
   - Remove findings with `confidence` below `config.confidence_threshold`.
   - Remove findings whose category or tags match `config.disabled_checks`.
   - Remove findings whose `file` matches any glob in `config.excluded_paths`.
   - Apply `config.severity_override`: matching category/tag → change severity (`"ignore"` → remove).
   - Per file, keep only the top `config.max_issues_per_file` findings (by severity then confidence).

3. **Count suppressed**: track removals as `SUPPRESSED_COUNT`.

4. **Sort**: severity (critical → important → suggestion), then file path ascending, then line number ascending.

---

### Phase 6: Report Rendering

1. **Filename**: `code-review-{CURRENT_BRANCH}-{YYYY-MM-DD HH:MM:SS}.md`. Replace `/` in branch with `-`. Unique per run.

2. **Report diff** (compare with previous): scan `.code-review/*.json` for the most recent (by mtime).
   - If exists, read/parse as `PREVIOUS_REPORT`.
   - **Match algorithm**: two findings match if same `id`, same `file`, and `abs(current.startLine - previous.startLine) <= 3`.
   - Categorize: `DIFF_NEW` (current not in previous), `DIFF_RESOLVED` (previous, non-suppressed, not in current), `DIFF_PERSISTING` (matched).
   - If none exists, `PREVIOUS_REPORT = null` and skip diff.

3. **Create directory**: ensure `.code-review/` exists.

4. **Check `.gitignore`**: if `.code-review/` is not ignored, warn the user.

5. **Generate markdown** at `.code-review/{filename}`:

````markdown
# Code Review Report

**Branch**: `{CURRENT_BRANCH}` → `{BASE_BRANCH}`
**Date**: {YYYY-MM-DD}
{if TICKET_CONTEXT is not null:}**Ticket**: {TICKET_CONTEXT.id} — {TICKET_CONTEXT.summary} (via {TICKET_CONTEXT.source})
{end if}**Files Changed**: {count} files
**Lines Changed**: +{added} -{removed}
**Specialists Run**: {csv of specialist IDs that were dispatched}
**Extensions Loaded**: {csv of extension IDs, or "none"}

---

## Environment

**CI/CD**: {csv of detected CI tools, or "None detected — consider adding CI before relying on code review."}
**Linters/Formatters**: {csv of detected linters/formatters, or "None detected — style issues may appear in findings."}
**Frameworks**: {csv of detected frameworks/extensions, or "None detected"}

{if `.code-review/` not in `.gitignore`:}
> ⚠️ `.code-review/` is not in `.gitignore` — consider adding it to avoid committing review reports.
{end if}

---

## Executive Summary

- **Critical Issues**: {count} (must fix)
- **Important Issues**: {count} (should fix)
- **Suggestions**: {count} (consider)
- **Suppressed**: {SUPPRESSED_COUNT} (below confidence threshold or filtered)
{if TICKET_CONTEXT is not null:}- **Requirements Gaps**: {count of category=requirements} (ticket alignment issues)
{end if}

**Overall Assessment**: {1-2 sentence summary, reference most important issues.{if TICKET_CONTEXT:} Include a statement about how well changes align with the ticket.{end if}}

**Top 3 Recommendations**:
1. {Most impactful — reference its ID}
2. {Second — ID}
3. {Third — ID}

---

## By Category

{For each category with findings:}

### {Category Name} ({count} issues)
- Critical: {n}, Important: {n}, Suggestions: {n}
{For each finding in category:}
- {icon} **[{finding.id}](#{finding.id})**: {finding.title} (`{file}:{line}`)
{end for}

{Severity icons: Critical → 🔴, Important → 🟡, Suggestion → 💡}

---

## Critical Issues

> Issues that could cause security vulnerabilities, bugs, or data corruption

{For each critical finding:}

### <a id="{finding.id}"></a>{finding.id} — {finding.title}

**File**: `{file}:{startLine}`
**Severity**: {severity} | **Category**: {category} | **Confidence**: {confidence}%

{description}

{if suggestion:}
**Suggested Fix**: {suggestion}
{end if}

{if codeBefore and codeAfter:}
```
// Before
{codeBefore}

// After
{codeAfter}
```
{end if}

---

{If none: "_No critical issues found._"}

## Important Issues

> Architecture violations, maintainability concerns, performance problems

{Same format as Critical for each important finding}

{If none: "_No important issues found._"}

## Suggestions

> Pattern opportunities, improvements, learning moments

{Same format as Critical for each suggestion finding}

{If none: "_No suggestions._"}

---

## By File

{For each file with findings:}

### `{file path}`
{For each finding:}
- {icon} **{finding.id}**: {title} (line {startLine})
{end for}

---

{if PREVIOUS_REPORT is not null:}
## Changes Since Last Review

- **New Issues**: {count of DIFF_NEW}
- **Resolved Issues**: {count of DIFF_RESOLVED}
- **Persisting Issues**: {count of DIFF_PERSISTING}

{if DIFF_NEW non-empty:}
### New Issues
{For each:}
- {icon} **{id}**: {title} (`{file}:{line}`)
{end for}
{end if}

{if DIFF_RESOLVED non-empty:}
### Resolved Issues
{For each:}
- ~~**{id}**: {title} (`{file}:{line}`)~~
{end for}
{end if}

---

{end if}

{if TICKET_CONTEXT is not null and acceptanceCriteria non-empty:}
## Requirements Alignment ({TICKET_CONTEXT.id})

| # | Criterion | Status | Finding |
|---|-----------|--------|---------|
{For each AC, numbered from 1:}
| {n} | {text} | {status} | {finding ID or —} |
{end for}

**Status values**:
- **Addressed**: no requirements finding flags this AC as missing/partial
- **Missing**: a finding with tag `requirements-gap` references it
- **Partial**: a finding with tag `missing-acceptance-criteria` references it

If no specialist produced a requirements finding for a given AC, evaluate whether the diff plausibly addresses it. If yes → **Addressed** with `—`. If no → **Missing** with `—`.

---

{end if}

## Summary Statistics

| Category | Critical | Important | Suggestion | Total |
|----------|----------|-----------|------------|-------|
{For each category:}
| {category} | {n} | {n} | {n} | {n} |
{end for}
| **Total** | **{t_crit}** | **{t_imp}** | **{t_sug}** | **{grand}** |

---
_Generated by code-review skill (orchestrator)_
````

6. **Generate JSON report** at `.code-review/{filename stem}.json` (pretty-print, 2-space indent):

```json
{
  "metadata": {
    "repo": "{repo name from git remote or directory}",
    "branch": "{CURRENT_BRANCH}",
    "baseBranch": "{BASE_BRANCH}",
    "timestamp": "{ISO 8601, e.g. 2026-02-16T15:30:00Z}",
    "ticket": "{TICKET_CONTEXT object or null}",
    "specialistsInvoked": ["..."],
    "extensionsLoaded": [],
    "filesChanged": 0,
    "linesAdded": 0,
    "linesRemoved": 0
  },
  "summary": {
    "totalFindings": 0,
    "critical": 0,
    "important": 0,
    "suggestions": 0,
    "requirementsGaps": 0,
    "suppressedCount": 0,
    "topRecommendations": [
      "{top id}: {title}",
      "{second id}: {title}",
      "{third id}: {title}"
    ]
  },
  "findings": [
    {
      "id": "sec-001",
      "category": "security",
      "severity": "critical",
      "confidence": 95,
      "file": "src/auth.ts",
      "startLine": 42,
      "title": "...",
      "description": "...",
      "specialist": "security",
      "suppressed": false
    }
  ],
  "diff": {
    "previousTimestamp": "{ISO 8601 or null}",
    "new": [],
    "resolved": [],
    "persisting": []
  }
}
```

**Important**: `findings` includes ALL findings — both active and suppressed. Suppressed have `"suppressed": true`. Sort the same as the markdown: severity, file path, line number; suppressed after active.

The `diff` object is always present. When no previous report exists, `previousTimestamp` is `null` and all three arrays are `[]`.

7. **Print summary to user**:
```
Review complete. Reports written to:
- .code-review/{markdown filename}
- .code-review/{json filename}

Found {total} issues: {critical} critical, {important} important, {suggestions} suggestions
({SUPPRESSED_COUNT} suppressed by config filters)

{if PREVIOUS_REPORT:}
Changes since last review: {n} new, {n} resolved, {n} persisting
{end if}

Top issues:
1. {top id}: {title}
2. {second id}: {title}
3. {third id}: {title}
```

---

## Skip These (Low Value)

Do NOT flag, and instruct specialists not to flag:
- Style/formatting (CI handles)
- Linting warnings (CI handles)
- Test failures (CI handles)
- Missing dependencies (CI handles)
- Minor naming suggestions unless truly confusing
- Adding comments to self-documenting code
- Logging suggestions unless for errors or security events
- Pedantic text accuracy unless it causes confusion
- Method length unless complexity is genuinely high
