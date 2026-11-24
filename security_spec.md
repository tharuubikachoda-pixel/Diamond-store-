# Diamond Store Security Specification (Phase 0)

## 1. Data Invariants
1. **Exclusive Admin Enforcement**: Only an authenticated user with `request.auth.token.email == 'rc0470638@gmail.com'` AND `request.auth.token.email_verified == true` holds `isAdmin()` privileges.
2. **Wallet Balance Integrity**: Customers cannot create a profile with `walletBalance != 0` or `isBlocked != false`, and cannot increase their own `walletBalance` via client writes. Only `isAdmin()` can credit/adjust wallet balances; users may only decrement `walletBalance` atomically during wallet order checkout (`walletBalance >= 0 && walletBalance < existing.walletBalance`).
3. **Order Lifecycle Integrity**: Customers can only create orders for their own `userId` with `status == 'pending'`, and can only transition a `'pending'` order to `'cancelled'`. Terminal states (`completed`, `cancelled`, `rejected`) are locked against non-admin updates.
4. **PII Isolation**: User profiles (`users/{userId}`), orders, wallet topups, wallet transactions, and support tickets are readable only by their `userId` owner or `isAdmin()`. No blanket `isSignedIn()` reads or lists.
5. **Support Subcollection Master Gate**: Messages under `support_tickets/{ticketId}/messages/{messageId}` check the parent `support_tickets/{ticketId}` document via `get()` to verify ownership or admin role, and block non-admins from setting `senderRole == 'admin'`.
6. **Strict Timestamp & Key Guards**: All `create` and `update` operations validate exact key sets (`hasAll`/`hasOnly` on create, `affectedKeys().hasOnly(...)` on update), server timestamps (`request.time`), regex-validated document IDs (`^[a-zA-Z0-9_\-]+$`), and string/array size limits.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Self-Credit Wallet Spoof**: User updates `users/{uid}` setting `walletBalance: 999999` -> `PERMISSION_DENIED`.
2. **Self-Unblock Spoof**: Blocked user updates `users/{uid}` setting `isBlocked: false` -> `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Token with `email: 'rc0470638@gmail.com'` and `email_verified: false` attempts package creation -> `PERMISSION_DENIED`.
4. **Cross-User Order Impersonation**: User A creates `orders/{id}` with `userId: userB` -> `PERMISSION_DENIED`.
5. **Instant Completed Order Bypass**: User creates `orders/{id}` with `status: 'completed'` -> `PERMISSION_DENIED`.
6. **Cancelled-to-Pending Resurrection**: User updates a `'completed'` or `'cancelled'` order back to `'pending'` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection on Order**: User includes `isFree: true` in `orders/{id}` -> `PERMISSION_DENIED`.
8. **PII Blanket List Scrape**: User A lists `/users` or `/orders` without `where('userId', '==', uid)` -> `PERMISSION_DENIED`.
9. **Support Admin Role Impersonation**: User posts a support message with `senderRole: 'admin'` -> `PERMISSION_DENIED`.
10. **Cross-Ticket Message Injection**: User A posts message into User B's `support_tickets/{ticketB}/messages/{msgId}` -> `PERMISSION_DENIED`.
11. **Oversized ID Poisoning**: Document ID > 128 chars or containing `/` / `$` -> `PERMISSION_DENIED`.
12. **Client-Forged Timestamp**: Creating an order with `createdAt` in the past/future instead of `request.time` -> `PERMISSION_DENIED`.
