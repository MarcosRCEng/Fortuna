# Versioning

Fortuna follows semantic versioning as planning guidance during pre-1.0 work.
Until `1.0.0`, minor versions mark playable or architectural milestones and
patch versions mark fixes that do not change the milestone scope.

## Current Release

- Current version: `0.2.0`
- Milestone: `v0.2.0 - Playable MVP`
- Integration branch: `integration/mvp-sprints-14-23`
- Source branch: `codex/gameplay-loop-base`
- Previous baseline tag: `v0.1.0-bootstrap`

## Release Rules

- `0.x.0`: product milestone, gameplay milestone, or architecture milestone.
- `0.x.y`: bug fix, documentation correction, test fix, seed/demo adjustment,
  or small compatibility update.
- `1.0.0`: first stable public contract for gameplay, API, persistence, and
  compliance posture.

## Financial Safety Rules

Every release must preserve these project invariants:

- Money is represented as integer cents.
- Floats are not a source of truth for financial state.
- Balances cannot become negative.
- Purchases require sufficient balance.
- Sales cannot exceed the current position.
- Leverage is not supported.
- The product remains educational and simulated unless a future compliance
  release explicitly changes scope.
- Any real market or investment integration must go through compliance review
  before being enabled.

## Release Checklist

Before a PR is marked ready for merge into `main`, verify:

- Build passes.
- Unit, coverage, and e2e tests pass.
- Prisma client generation passes.
- Release documentation exists.
- The release checklist has been reviewed.
- No real investment execution, brokerage integration, or recommendation engine
  has been introduced.
