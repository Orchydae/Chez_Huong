---
name: commit-message
description: Generate a Linus-style git commit message (imperative subject ≤50 chars, body wrapped at 72 chars, explains the "why") for staged changes or the current branch's diff vs base. Use when the user wants help writing a commit message, drafting a commit, or summarizing changes for git history. Does NOT run `git commit` unless the user asks.
---

Produce a high-quality, Linus-style commit message for the set of changes about to be committed. Follow https://gist.github.com/finalfantasia/bd0070673ca27e5f7473.

## Rules

- **Subject**: imperative present tense, ≤50 chars, no trailing period.
- Blank line between subject and body.
- **Body**: explain "what" and (especially) "why" — not "how". Wrap at 72 chars.
- Use bullet lists in the body for multiple affected areas.
- If the current branch contains a ticket ID (regex `/([A-Z][A-Z0-9]+-\d+)/i`), prefix the subject with `[TICKET_ID] `.

## Process

1. Detect git context:
   - Current branch: `git rev-parse --abbrev-ref HEAD`
   - Base branch: prefer `origin/main`, fall back to `main`, then `master`.

2. Identify the change set, in this priority order:
   - **Staged changes**: `git diff --name-only --cached` (if anything is staged, use this)
   - **Branch vs base**: `git diff --name-only <base>...HEAD`
   - **Explicit range** if the user supplied one (e.g., `commitA..commitB`)

3. If **nothing is staged** and the user asked for a "commit message":
   - List unstaged + untracked files via `git status --porcelain`.
   - Show the list and ask the user which files to include. Do NOT auto-stage without explicit approval.
   - If the user approves, run the specific `git add <path>` commands. Otherwise, print the exact `git add` commands and stop.

4. Classify files: `git diff --diff-filter=ADM --name-status <base>...HEAD`.

5. Read the diff for the most impactful files (skip lockfiles, generated output). Look for the highest-level unit changed — package, top-level module, or feature directory — and use that as scope.

6. Build the subject line:
   1. Start with an imperative verb: `Add`, `Fix`, `Update`, `Refactor`, `Remove`, `Docs:`, etc.
   2. Follow with a short object/scope (e.g., `Add JSON schema validation to auth module`).
   3. ≤50 chars; if longer, drop the least essential words.
   4. Prepend `[TICKET_ID] ` if extracted from the branch.

7. Compose the body:
   - **Paragraph 1**: why this change is necessary and what it accomplishes.
   - **Paragraph 2** (optional): brief description of how it was implemented + trade-offs / compatibility notes.
   - Do **not** list every file — the diff covers that. Mention an area only if it affects the "why".

8. Present the final message in a fenced block ready to paste, then ask whether the user wants you to `git commit -F` it.

## Heuristics

- Use `Fix:` only if it's a real bug fix. Prefer `Refactor:` for behavior-preserving changes (and say so in the body).
- For small/single-line changes (typos, whitespace), prefer a descriptive subject: `Fix typo in CONTRIBUTING.md` over `Fix`.

## Safety

- Never run destructive git operations (rebase, reset, push) without explicit approval.
- Never include secrets or large patches in the commit body.
- Only call `git fetch` if needed and after asking, when network access may be restricted.

## Output template

```
[TICKET-123] Imperative subject line (≤50 chars)

Short paragraph explaining why this change is necessary and what it
accomplishes. Wrap at 72 chars.

- Bullet for distinct affected area, if helpful
- Another bullet
```
