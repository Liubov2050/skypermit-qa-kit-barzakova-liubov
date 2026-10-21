# Test Plan — SkyPermit Full Application

**Version:** 1.0 · **Date:** 2026-10-21 · **Author:** Liubov Barzakova (QA) · **Source:** `ct-gen-ai-skypermit/docs/01`–`08`

## 1. Introduction & Objective
This plan covers the SkyPermit drone flight-permit system: operator portal, reviewer queue, and the `/api/v1` REST API behind them.
The goal is to verify that every request is accepted, rejected or transitioned exactly as the docs specify, with correct status codes and rule citations.

## 2. Scope
**In Scope**
- Auth & access — register/login/logout/me, `401`/`403`, operator scoping, `X-Reviewer-Id`
- Registry — operators, pilots, aircraft; uniqueness; derived currency and weight band; >30,000 g refused
- Zone catalogue — read-only, six seeded zones, `A-7` curfew overrides
- Gate pipeline — PILOT → AIRCRAFT → ZONE → TIME_WINDOW, first failure, `422` body, `rule_reference`
- `validate` — same result as `submit`, never changes state
- Lifecycle — seven states, legal transitions, `409` otherwise, cancellation deadline, `ReviewAction`/`AuditLog`
- UI — operator portal and reviewer queue via `data-testid`; pickers not pre-filtered
- Platforms: REST API `/api/v1`; web UI (browsers TBD — not specified in source)
- Test types: functional, API contract, boundary, state-transition, authorisation, UI, regression

**Out of Scope**
- Performance / load / security penetration — not in requirements
- `CR-1` proposal and `OH-1` v1.4 values — not in force
- Zone edits and raising `authorisation_level` — out-of-band admin actions
- Developer Vitest suite and `app/api/items` scaffold — not ours
- Visual design — spec says styling is intentionally minimal

## 3. Test Strategy & Environment
- **Approach:** Doc-driven, risk-based; gates and lifecycle first, UI after API is stable.
- **Techniques:** Boundary values (currency, bands, lead time, 60 days, duration, curfew, ceiling, deadline), state-transition, decision tables, two-gate ordering tests.
- **Tools:** API client, UI automation framework, defect tracker — TBD.
- **Environments:** Running SkyPermit instance — base URL TBD.
- **Test data:** Zones from `supabase/seed.sql`; times generated relative to now, in UTC; secrets via env vars only.

## 4. Entry & Exit Criteria
**Entry**
- Test plan approved; open items in `05` acknowledged by owners
- Instance reachable with seeded zones, test operator accounts and reviewer ID
- Maintenance completion endpoint path and access confirmed

**Exit**
- 100% planned cases executed; every `06` §6 `rule_reference` covered
- Full illegal-transition matrix returns `409`
- 0 open Critical/High defects; rest triaged
- Open-item cases recorded as "expected result undefined", not failed

## 5. Schedule & Deliverables
| Milestone | Date | Deliverable |
|---|---|---|
| Test planning | TBD | This test plan |
| Test design | TBD | Test cases, checklists, traceability to docs |
| Execution | TBD | Execution log, bug reports, automated API/UI suites |
| Closure | TBD | Test summary report |

## 6. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Open items: `SUSPENDED` operator response, zone-`active` citation, exact 2-hour deadline boundary | Mark "expected result undefined"; raise with rules owner |
| Time-dependent rules (lead time, currency, curfew, deadline) cause flaky tests | Generate dates relative to now in UTC; keep margins explicit |
| No running environment; completion endpoint missing from `03` | Request base URL and endpoint details before execution starts |
