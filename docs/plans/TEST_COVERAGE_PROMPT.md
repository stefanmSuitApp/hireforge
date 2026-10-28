# Prompt · Phase T: test coverage to the autofind level (Claude Code, `hireforge-tests`)

For a fresh Claude Code chat opened in `~/Dev/DEVLEGION/hireforge-tests`. It
works through [`TEST_COVERAGE.md`](./TEST_COVERAGE.md) one stage at a time.
Paste the block as-is. To resume after a reset, paste it again: the
implementation log in the plan says where to continue.

```text
You are Claude Code, implementing Phase T (test coverage) for Šljakam / hireforge, in the clone
~/Dev/DEVLEGION/hireforge-tests on branch docs/test-coverage-plan. Plan: docs/plans/TEST_COVERAGE.md.

HARD RULE (Stefan, 2026-10-28): do NOT commit or push anything from this branch or any branch you
make in this clone. No git commit, git push, PR, merge, tag, deploy, or `gh` writes. All work stays
as uncommitted changes in this working tree, and Stefan commits it himself. If a hook, doc or skill
says "commit"/"push"/"merge"/"deploy", this rule wins: instead, write the suggested commit message
and its file list into the plan's implementation log. To pull upstream changes, use only:
git fetch origin && git stash && git merge --ff-only origin/main && git stash pop.

Start:
1. Read ~/.claude/CLAUDE.md, CLAUDE.md, PROGRESS.md, NEEDS_STEFAN.md, docs/plans/TEST_COVERAGE.md
   (the whole thing; the implementation log says where you are), and docs/plans/SEO_AND_QUALITY_GATES.md
   (a snapshot; the live copy is ~/Dev/DEVLEGION/hireforge-seo/docs/plans/).
2. Check what has merged since the plan was written: git fetch origin; git log origin/main.
   - Has Phase C (fix/phase-c-hardening) merged? Has SEO (feat/seo-quality-gates) merged?
   - The plan's "Order of work" says which stages each one unlocks. Don't start a stage whose
     upstream isn't on main.
   - Don't read or edit the working trees of ~/Dev/DEVLEGION/hireforge or hireforge-seo: other
     sessions are using them. Read-only `git -C … show/log/diff` is fine.
3. The reference implementation is autofind-platform origin/main. Read it with
   `git -C ~/Dev/DEVLEGION/autofind-platform show origin/main:<path>` (start with docs/TESTING.md,
   libs/testing/, apps/api/src/tenant-isolation.int.test.ts, apps/api/src/__harness__/,
   scripts/rules.test.ts, scripts/check-changed.mjs). Never check out a branch in an autofind worktree.

Decisions 1–2 in the plan: if NEEDS_STEFAN.md or PROGRESS.md records Stefan's answer, follow it.
Otherwise take the recommended option and note it as "assumed, reversible" in the log.

For each step of the current stage:
- Write tests that click like a person (e2e). Name them as behaviour sentences. Keep them
  deterministic (fixed clock, no retries, stubs for Resend / NBS / Sanity). Use real Postgres and
  Redis where the plan says.
- Prove each new test catches its bug: run it against the old code, or with the fix reverted, and
  see it fail. Note "shown failing: <how>" in the log.
- Don't change app behaviour. When a test finds a real bug, write it as it.fails and add a
  PROGRESS.md "Known issues" line, unless the fix is under ~20 lines and obviously right. Then
  leave that fix in the tree too, logged as its own suggested fix(...) commit.
- No new migrations. Never edit drizzle/ files that are on main.
- Stick to new files while Phase C / SEO are unmerged (plan → "Conflict control"). When a check
  outside your diff is red, find the root cause first. Don't paper over it.
- Run the full repo check from the root (pnpm lint && pnpm format && pnpm typecheck && pnpm test
  && pnpm build, + pnpm test:integration once T1 exists, + pnpm e2e for e2e stages).
- Tick the step in the implementation log with: files, the check result (red stays red in the log),
  "shown failing" notes, and a suggested conventional-commit message.

Never: commit, push, open PRs, merge, deploy, touch production or the Hetzner VM, put secrets in
code or chat, create external accounts. Anything only Stefan can do goes into NEEDS_STEFAN.md
(no secrets there either).

Stop at the end of each stage group in the plan's "Order of work", or when blocked on Stefan or on
an unmerged upstream. Report:
- what is in the working tree;
- the suggested commits in order;
- the check results;
- any known bugs found;
- what's next.
```
