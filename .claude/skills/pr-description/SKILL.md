---
name: pr-description
description: Generate a pull request description from the current branch's changeset, following the team's PR template (Jira ticket header, summary, type of change, test plan, checklist). Use when the user wants to write/create/prepare a PR description, draft PR body, or open a pull request for the current branch.
---

Generate a PR description for the **current branch's changeset** (current branch vs base branch) using the template below.

## Process

1. Detect base branch — try `origin/main`, then `origin/master`, then `origin/develop`. Use the first one that exists.
2. Get current branch name with `git rev-parse --abbrev-ref HEAD`.
3. Extract Jira-style ticket ID from the branch name with regex `/([A-Z][A-Z0-9]+-\d+)/i` (e.g., `feature/PROJ-1234-add-retry` → `PROJ-1234`). If no ticket is found, leave the placeholder `INSERT-TICKET-ID-HERE` in the link.
4. Run `git log {base}..HEAD --oneline` and `git diff {base}...HEAD --stat` to understand what changed.
5. Read the diff of meaningful files (skip lockfiles, generated code) to write an accurate Summary.
6. Choose the correct "Type of change" checkbox(es) based on the diff:
   - Pure bug fix → Bug fix
   - New endpoint/feature/module → New feature
   - Internal-only restructuring with no behavior change → Code refactoring
   - API/contract/schema change that breaks consumers → Breaking change
   - Significant doc updates required → "requires a documentation update"
7. Fill the "How has this been tested" section based on test files added/modified in the diff. If no tests changed, list manual verification steps that match the change.
8. Leave the Checklist items unchecked unless the diff provides clear evidence (e.g., added tests → check the "added tests" item; self-review is fine to pre-check).

## Template

Output the final PR description inside a single fenced markdown block so the user can copy it directly:

````markdown
# [JIRA Ticket](https://decksign.atlassian.net/browse/INSERT-TICKET-ID-HERE)

## Summary

> ⚠️ If Urgent, explain why here.

<1-3 sentence summary of changes and the motivation/context.>

**Dependencies & associated PRs**:
- <e.g., requires DB extension X, npm package Y, or PR #123 — or "None">

**Smaller changes included**:
- <bullet 1>
- <bullet 2>

### Type of change

- [ ] Bug fix (non-breaking change which fixes an issue).
- [ ] New feature (non-breaking change which adds functionality).
- [ ] Code refactoring or code optimization.
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected).
- [ ] This change requires a documentation update.

## How has this been tested

<Brief description of tests run + repro instructions + relevant config.>

- [ ] <Test 1>
- [ ] <Test 2>

### Screenshots/Screen recordings

<Relevant screenshots, or remove this section if N/A.>

## Checklist before requesting code review

- [ ] My code follows the style guidelines of this project.
- [x] I have performed a self-review of my code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have made corresponding changes to the documentation.
- [ ] My changes generate no new warnings.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] New and existing unit tests pass locally with my changes.
- [ ] Any dependent changes have been merged and published in downstream modules.
- [ ] My code is logged with the proper level.
- [ ] I have validated that no sensitive data is written to the application logs.

## References

<Links to design docs, related tickets, RFCs, or external references — or remove if none.>
````

## Notes

- Do NOT invent ticket IDs. If you cannot extract one from the branch, leave the placeholder.
- Keep the Summary tight — the diff stat tells the reader the scope; the Summary should answer "why" first, "what" second.
- Delete sections that are genuinely empty (e.g., Screenshots, References) rather than leaving placeholder text.
