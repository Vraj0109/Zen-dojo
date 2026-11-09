---
id: sd-security
title: Security
area: sd
section: C. Building blocks
---

## Overview

Security in a design round means: who is the caller (authentication), what may they do (authorization), protecting data in transit and at rest, and handling secrets and personal data properly. Mention it briefly, unprompted.

## What to know

1. AuthN vs AuthZ :: Authentication verifies identity (password + MFA, SSO, tokens). Authorization decides what that identity may do (role-based or attribute-based access, resource ownership checks). Check authorization on the server for every request; most real breaches are broken authorization (IDOR).

2. OAuth2 :: A delegation framework: a user lets an app access their resources without sharing a password. The authorization-code flow with PKCE gives the app an access token (short-lived) and a refresh token. OpenID Connect adds identity (an ID token) on top for 'log in with Google'.

3. JWT vs sessions :: Server sessions: a random session id in a cookie maps to server-side state; easy to revoke, but needs a shared store. JWTs: signed, self-contained claims verified without a lookup; stateless and fast, but hard to revoke before expiry. Keep JWTs short-lived and pair them with refresh tokens.

4. API keys and mTLS :: API keys identify calling applications (not users); store them hashed, scope them, and rotate them. Mutual TLS: both sides present certificates, which gives strong service-to-service identity and is common inside a service mesh.

5. Encryption at rest and in transit :: In transit: TLS everywhere, including internal traffic. At rest: disk or database encryption with keys in a KMS, plus envelope encryption (data keys encrypted by a master key). Field-level encryption for especially sensitive columns.

6. Secrets management :: Never put secrets in code or images. Use a secrets manager (Vault, AWS Secrets Manager) with access control, audit logs and rotation; inject secrets at runtime and prefer short-lived credentials.

7. PII handling :: Collect only what you need, restrict access, mask PII in logs, encrypt sensitive fields, set retention periods, and support deletion requests (GDPR). Tokenize payment data so card numbers never touch your main systems.

## Recap

- AuthN = who you are; AuthZ = what you may do (RBAC/ABAC, checked server-side).
- OAuth2 authorization code + PKCE for user login; client credentials for service-to-service.
- JWT: stateless but hard to revoke → short expiry + refresh tokens. Sessions: easy to revoke.
- TLS in transit, KMS-managed keys at rest, secrets in a vault, least privilege everywhere.

## Go deeper

### Authentication patterns {point: 0}

Sessions: after login, the server creates a session record (in Redis/DB) and gives the browser a cookie with a random session id (HttpOnly, Secure, SameSite). Easy to revoke (delete the session) and the cookie is small; needs a lookup per request (cheap with Redis). Protect against CSRF with SameSite cookies and CSRF tokens for state-changing requests.

JWT access tokens: signed claims (user id, scopes, expiry) that services verify locally with the issuer's public key, with no lookup. Great for service-to-service and distributed verification; hard to revoke before expiry, so keep them short-lived (5-15 minutes) and use refresh tokens (stored server-side, revocable, rotated on use) to get new ones. Don't store JWTs in localStorage if XSS is a risk; prefer HttpOnly cookies for browser apps.

Passwords: hash with a slow, salted algorithm (Argon2id, bcrypt, scrypt), never plain SHA. Add MFA (TOTP, WebAuthn/passkeys), rate-limit and lock out login attempts, and use breached-password checks.

### Authorization models {point: 0}

Role-based access control (RBAC): users get roles (admin, editor, viewer), roles get permissions. Simple and auditable; becomes messy when permissions depend on the resource (can edit only their own documents).

Attribute-based (ABAC) or policy-based: decisions from attributes of the user, resource and context ('user.department == doc.department and time within business hours'), expressed in a policy engine (OPA/Rego, AWS Cedar). Relationship-based (ReBAC): permissions follow relationships in a graph ('can view if member of a team that owns the folder containing the doc'), as in Google Zanzibar and its open-source descendants (SpiceDB, OpenFGA).

Rules: check authorization on the server for every request (never trust the client), check access to the specific object (prevent IDOR: /orders/124 when you own 123), apply least privilege for services too (each service's credentials can do only what it needs), and log authorization decisions for sensitive actions.

### OAuth2 authorization code flow with PKCE {point: 1}

1) App creates a random code_verifier and sends its hash (code_challenge) with the redirect to the authorization server. 2) User logs in and consents; the server redirects back with a short-lived code. 3) App exchanges the code + code_verifier for tokens; the server checks the hash, so an intercepted code is useless. 4) App gets an access token (short-lived, e.g. 15 min) and a refresh token.

APIs validate the access token (JWT signature + expiry + audience, or introspection) and check scopes/roles. OpenID Connect adds an ID token for identity.

### Protecting data and the system {point: 4}

In transit: TLS everywhere, including internal traffic (mTLS via a service mesh gives each service an identity). At rest: storage encryption with keys in a KMS; application-level encryption for especially sensitive fields; key rotation policies.

Secrets: in a secrets manager, injected at runtime, rotated automatically where possible, never in code, images or logs; short-lived credentials (IAM roles, workload identity) beat long-lived keys.

Common vulnerabilities to mention: injection (use parameterized queries), XSS (escape output, Content Security Policy), CSRF, SSRF (validate and restrict outbound URLs, block metadata endpoints), insecure deserialization, and broken access control (the most common). Add rate limiting and bot protection on login and expensive endpoints, audit logs for admin actions, and data minimization (don't collect or keep personal data you don't need; define retention and deletion).

### Protecting PII and secrets {point: 5}

Classify fields (email, phone, address, payment data). Encrypt sensitive columns with envelope encryption: a data key per record/tenant encrypts the data, and KMS encrypts the data key; rotating means re-wrapping keys, not re-encrypting everything. Tokenize card numbers (store a token, keep the PAN in a PCI-scoped vault).

Never log PII or tokens, restrict who can query production, keep audit logs, and support deletion (GDPR) by keying data by user and having a deletion pipeline including backups' retention limits.

## Interview questions

- Sessions or JWTs for a web app? How would you log a user out everywhere?
- How do services authenticate each other?
