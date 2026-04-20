# Firestore Security Specification

## Data Invariants
1. **User Identity Invariant**: A user can only access the platform if they have a document in the `users` collection with a valid role (`admin` or `operator`).
2. **Role Immutability**: Users cannot change their own roles. Only `shakar46` (Super Admin/Head) or existing admins can manage user roles, but no one can demote the Super Admin.
3. **Audit Integrity**: Audit logs are append-only. No one can update or delete audit logs.
4. **Content Management**: Only admins can manage (create/update/delete) Scripts and Learning Base materials. Operators can only read them.
5. **Appeal Ownership**: Appeals are managed by staff. Deletion is restricted to admins.

## The "Dirty Dozen" Payloads (Attack Vectors)

1. **Self-Promotion**: Authenticated user tries to create/update their own `users` document with `role: "admin"` when they are not an admin.
2. **Access Without Record**: A user with a valid Firebase Auth UID but no `users` document tries to read `appeals`.
3. **Ghost Update**: Updating an appeal and adding an unauthorized field like `is_validated: true` to bypass workflow (if such field existed).
4. **Audit Tampering**: Attempting to delete an `audit_logs` document to hide activity.
5. **Script Poisoning**: An operator attempting to update a script to provide incorrect information to other operators.
6. **Learning Base Hijack**: A non-admin user attempting to delete a standard instruction file.
7. **Identity Spoofing**: Creating an appeal and setting `authorId` to another user's UID.
8. **Malicious ID**: Attempting to create a document with an extremely long ID (1.5KB) to cause resource exhaustion.
9. **Super Admin Demotion**: An admin attempting to change the role of `shakar46`.
10. **Private Data Leak**: Attempting to list all `users` without having `admin` role.
11. **Orphaned Appeal**: Creating an appeal without a valid branch name or required fields.
12. **Status Shortcut**: Updating an appeal status directly to "Выполнен" without having required intermediate data (atomic check).

## Tests Coverage Plan
- `test_user_isolation`: Verify users only see their own profile or nothing if not staff.
- `test_admin_privileges`: Verify admins can manage scripts and users.
- `test_operator_restrictions`: Verify operators can read but not change configuration.
- `test_audit_immutability`: Verify `audit_logs` are write-only.
- `test_learning_base_rules`: Verify the new `learning_base` collection is secured.
