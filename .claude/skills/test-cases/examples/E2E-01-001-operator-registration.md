# Auth & access — Operator registration

### E2E-01-001 — Verify Unauthenticated user can register as an Operator with all form fields filled

**Priority:** High
**Type:** Positive
**Preconditions:**
- No SkyPermit session cookie in the browser (use a fresh private window)
- `<timestamp>` is the current time in `yyyyMMddHHmmss` format, generated once per run (e.g. `20261021143000`), so the email and national ID are unique (the docs give no way to delete an operator, so each run creates a new account)

| # | Step | Expected result |
|---|------|-----------------|
| 1 | As an Unauthenticated user (no session), open `https://skypermit.vercel.app/register` | Page "Register as an operator" loads with the registration form. The header shows the "Log in" and "Register" links; no "Log out" button is shown |
| 2 | Check which form fields are marked required | "Email", "Password", "Legal name" and "National ID" carry the "required" tag. "Phone", "Address", "City" and "Postal code" carry no tag. There is no authorisation level field on the form |
| 3 | Type `qa+<timestamp>@example.com` into the "Email" field | Value is shown in the field |
| 4 | Type `QaPass123!` into the "Password" field | Value is shown masked |
| 5 | Type `QA Aerial Survey <timestamp>` into the "Legal name" field | Value is shown in the field |
| 6 | Type `QA-<timestamp>` into the "National ID" field | Value is shown in the field |
| 7 | Type `+380441234567` into the "Phone" field | Value is shown in the field |
| 8 | Type `1 Khreshchatyk St` into the "Address" field | Value is shown in the field |
| 9 | Type `Kyiv` into the "City" field | Value is shown in the field |
| 10 | Type `01001` into the "Postal code" field | Value is shown in the field |
| 11 | Click the "Register" button | No error message is shown. The operator is logged in immediately: the browser opens `https://skypermit.vercel.app/operator/pilots` ("Pilot registry"). The header shows the "Pilots", "Aircraft", "My Requests" and "New Request" links, the name `QA Aerial Survey <timestamp>` and the "Log out" button; the "Log in" and "Register" links are gone |
| 12 | In the same browser tab, open `https://skypermit.vercel.app/api/v1/auth/me` | `200` JSON with `email` = `qa+<timestamp>@example.com`, `legal_name` = `QA Aerial Survey <timestamp>`, `national_id` = `QA-<timestamp>`, `phone` = `+380441234567`, `address_line` = `1 Khreshchatyk St`, `city` = `Kyiv`, `postal_code` = `01001`, `authorisation_level` = `L1` |
