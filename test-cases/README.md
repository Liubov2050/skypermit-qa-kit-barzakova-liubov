# Test Cases — Module Registry

Single source of module numbers for E2E test case IDs (`E2E-<MM>-<NNN>`).
App under test: `https://skypermit.vercel.app`. Test cases use full URLs on this base.

Add a row only after the module number and name are confirmed. Never renumber a module.

| # | Module | Folder | Covers |
|---|---|---|---|
| 01 | Auth & access | `test-cases/01-auth-access/` | register, login, logout, me, 401/403, operator scoping, `X-Reviewer-Id` |
| 02 | Registry | `test-cases/02-registry/` | operators, pilots, aircraft, uniqueness, derived currency and weight band |
| 03 | Zone catalogue | `test-cases/03-zone-catalogue/` | read-only zones, seed data, `A-7` curfew overrides |
| 04 | Gate pipeline | `test-cases/04-gate-pipeline/` | PILOT → AIRCRAFT → ZONE → TIME_WINDOW, `validate` vs `submit`, 422 body |
| 05 | Request lifecycle | `test-cases/05-request-lifecycle/` | seven states, legal transitions, 409, cancellation deadline, completion |
| 06 | Reviewer queue | `test-cases/06-reviewer-queue/` | queue view, approve/reject, `ReviewAction` / `AuditLog` |
