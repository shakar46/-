# Security Specification: CRM Complaint Management System

## Data Invariants
1. **Requests**:
   - Must have a valid `branchId`.
   - `status` must be one of ['new', 'in_progress', 'done', 'under_review', 'cancelled'].
   - `clientName` and `clientPhone` are required and must be strings with size limits.
   - `createdAt` is immutable after creation.
   - Only Managers and above can change status to 'done'.
   - Once `status` is 'done' (terminal state), no further updates are allowed (except by admins).

2. **Actions**:
   - Must be linked to a valid `requestId`.
   - `createdBy` must match the authenticated user's UID.
   - `resolution` is required and limited in size.

3. **Users**:
   - Only the user themselves can read/write their base profile.
   - Roles can only be changed by Admin/Head.

## The "Dirty Dozen" Payloads (Deny List)
1. **Request Creation without Auth**: `{ clientName: "Attacker" }` -> DENIED.
2. **Request Creation with unverified email**: `{ clientName: "Attacker", ... }` as user with `email_verified: false` -> DENIED (unless @crm-internal.local).
3. **Request Update of terminal status**: Change `clientName` on a Request where `status == 'done'` -> DENIED.
4. **Id Spoofing**: Create Request with `createdBy: "someone_else_uid"` -> DENIED.
5. **Id Poisoning**: `GET /requests/very-long-id-junk-chars...` -> DENIED.
6. **Shadow Update**: `PATCH /requests/123` with `{ isVerifiedByAdmin: true }` -> DENIED (hasOnly gate).
7. **Action Spoofing**: Create Action for a request the user doesn't have access to -> DENIED.
8. **PII Leak**: Authenticated user trying to `GET` another user's private data -> DENIED.
9. **Role Escalation**: User trying to update their own `role` to 'admin' -> DENIED.
10. **State Shortcutting**: User trying to set status to 'done' without being a manager -> DENIED.
11. **Resource Exhaustion**: Create Request with 1MB `clientName` string -> DENIED.
12. **Orphaned Action**: Create Action with `requestId` that doesn't exist -> DENIED.

## Test Runner (Logic)
The `firestore.rules.test.ts` would verify that:
- `isEmailVerified()` correctly handles internal vs external emails.
- `isValidRequest()` enforces all constraints.
- `affectedKeys().hasOnly()` protects against shadow fields.
- Terminal states are respected.
