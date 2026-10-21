# Test Plan — SkyPermit Flight-Request State Machine

**Version:** 1.0 · **Date:** 2026-10-21 · **Author:** Liubov Barzakova (QA) · **Source:** `ct-gen-ai-skypermit/docs/02-state-machine.md`

## 1. Introduction & Objective
This plan covers the `FlightRequest` lifecycle: seven states, ten legal transitions, and the rules that guard them.
The goal is to confirm every legal transition succeeds and every other `(from, action)` pair returns `409`.

## 2. Scope
**In Scope**
- Submit flow — `DRAFT` → `UNDER_REVIEW` / `REJECTED`; `SUBMITTED` never observed at rest
- Reviewer decisions — approve/reject from `UNDER_REVIEW`; `X-Reviewer-Id` required; reject `note` required
- Cancellation — from `DRAFT`, `UNDER_REVIEW`, `APPROVED`; 2-hour `window_start` deadline
- Completion — `APPROVED` → `COMPLETED` only via maintenance endpoint, never by elapsed time
- Illegal transitions — full `(from, action)` matrix; terminal states reject everything with `409`
- Side effects — `failing_gate`/`rejection_reason` on `REJECTED`; `ReviewAction` row on approve
- Overlap visibility — only `APPROVED`/`UNDER_REVIEW` block same-aircraft bookings
- Platforms: REST API (state-changing endpoints); UI — TBD, not specified in source
- Test types: functional, state-transition, negative, boundary, authorisation, regression

**Out of Scope**
- Individual gate rules — covered by business-rules plan
- UI flows — not described in source
- Performance / load — not in requirements
- DB trigger and code internals — implementation, not behaviour
- Modifying the app — folder is read-only

## 3. Test Strategy & Environment
- **Approach:** Doc-driven, risk-based; transition table in `02` is the oracle.
- **Techniques:** State-transition (0-switch and 1-switch), decision table for `(state, action)`, boundary values on deadline.
- **Tools:** API client / automation framework — TBD; defect tracker — TBD.
- **Environments:** Running SkyPermit instance — base URL TBD.
- **Test data:** Requests built to pass or fail gates on demand; secrets via env vars only.

## 4. Entry & Exit Criteria
**Entry**
- Test plan reviewed and approved
- Running instance with base URL, operator account and reviewer ID available
- Test data can drive a request into every reachable state
- Maintenance completion endpoint accessible to QA

**Exit**
- 100% of legal transitions and illegal-pair matrix executed
- 0 open Critical/High defects; remaining defects triaged
- Deadline boundaries (just inside / at / just outside 2 h) executed
- Test summary report delivered

## 5. Schedule & Deliverables
| Milestone | Date | Deliverable |
|---|---|---|
| Test planning | TBD | This test plan |
| Test design | TBD | Transition matrix test cases, checklist |
| Execution | TBD | Execution log, bug reports |
| Closure | TBD | Test summary report |

## 6. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| `SUBMITTED` → cancel window is near-unreachable (gates run synchronously) | Mark as limited black-box coverage; confirm testability with developers |
| Exactly-2-hour boundary inclusivity not stated ("up to 2 hours") | Raise clarification; mark exact-boundary case "expected result undefined" until answered |
| No running environment yet; side effects (`ReviewAction`) may need DB visibility | Request base URL early; verify via `GET` responses, flag gaps |
