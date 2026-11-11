# Zone catalogue — Zone data as catalogued

### E2E-03-003 — Verify Operator can see zone `LVV-RST-2` with its catalogued data

**Priority:** Medium
**Type:** Positive
**Preconditions:**
- Operator `qa+<timestamp>@example.com` is logged in (register at `https://skypermit.vercel.app/register` with `qa+<timestamp>@example.com` / `QaPass123!`, or log in at `https://skypermit.vercel.app/login` with the same credentials)
- `<timestamp>` is the current time in `yyyyMMddHHmmss` format, generated once per run (e.g. `20261021143000`), so the account is unique

| # | Step | Expected result |
|---|------|-----------------|
| 1 | As Operator `qa+<timestamp>@example.com` (logged in), open `https://skypermit.vercel.app/api/v1/zones/LVV-RST-2` | `200` JSON for one zone with `code` = `LVV-RST-2`, `name` = `Lviv Restricted 2`, `zone_class` = `RESTRICTED`, `ceiling_metres` = `60`, `permitted_bands` = `C0`, `C1`, `required_authorisation_level` = `L3`, `curfew_start` = `22:00`, `curfew_end` = `06:00`, `active` = `true`. The curfew times are `22:00` and `06:00`; a trailing seconds part (`22:00:00`) is acceptable, because the docs do not fix the time format |
| 2 | In the same browser tab, open `https://skypermit.vercel.app/api/v1/zones` | `200` JSON list of the zone catalogue. It contains an entry for `LVV-RST-2` with the same values as in Step 1 |
