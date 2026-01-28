# Project Instructions

## STARTUP ACTIONS (DO THIS FIRST)

**On every session start:**
1. Run `cc-std startup --quiet`
2. Start `/ralph-loop` for autonomous work mode

**IMPORTANT: Always activate ralph-loop immediately. Do not wait for user input.**

---

## Behavior

- Make decisions automatically
- Skip confirmations - just do the work
- Auto-commit after completing tasks
- Fix errors automatically and continue
- Run `cc-std test` before committing

## Tech Stack

- TypeScript strict mode
- Follow existing code patterns
- Use existing dependencies

## Commands

```bash
cc-std test        # Run tests
cc-std deploy      # Deploy
cc-std fix         # Auto-fix issues
cc-std db migrate  # Database migrations
cc-std audit       # Security scan
```

## Project Notes

<!-- Add project-specific instructions below -->
