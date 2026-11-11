# Zone catalogue — Zone data as catalogued

### E2E-03-002 — Verify Operator can see zone `ODS-CTR-5` with its catalogued data

**Priority:** Medium
**Type:** Positive
**Preconditions:**
- Operator `qa+<timestamp>@example.com` is logged in (register at `https://skypermit.vercel.app/register` with `qa+<timestamp>@example.com` / `QaPass123!`, or log in at `https://skypermit.vercel.app/login` with the same credentials)
- `<timestamp>` is the current time in `yyyyMMddHHmmss` format, generated once per run (e.g. `20261021143000`), so the account is unique

| # | Step | Expected result |
|---|------|-----------------|
| 1 | As Operator `qa+<timestamp>@example.com` (logged in), open `https://skypermit.vercel.app/api/v1/zones/ODS-CTR-5` | `200` JSON for one zone with `code` = `ODS-CTR-5`, `name` = `Odesa Corridor 5`, `zone_class` = `CONTROLLED`, `ceiling_metres` = `90`, `permitted_bands` = `C0`, `C1`, `C2`, `required_authorisation_level` = `L2`, `curfew_start` = `23:00`, `curfew_end` = `05:00` (the `A-7` curfew narrowing), `active` = `true`. The curfew times are `23:00` and `05:00`; a trailing seconds part (`23:00:00`) is acceptable, because the docs do not fix the time format |
| 2 | In the same browser tab, open `https://skypermit.vercel.app/api/v1/zones` | `200` JSON list of the zone catalogue. It contains an entry for `ODS-CTR-5` with the same values as in Step 1 |
