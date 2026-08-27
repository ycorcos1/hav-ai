# ADR 010: No Custom Backend for V1

## Status

Accepted

## Context

havAI V1 must remain simple to develop, deploy, and operate. The approved architecture uses Supabase for authentication, PostgreSQL, RLS, and Edge Functions where server-side logic is required. V1 explicitly excludes custom backend servers, microservices, and additional infrastructure layers.

## Decision

V1 does **not** use a custom backend API server.

Prohibited for V1:

```text
Express
NestJS
Fastify
EC2 backend
ECS backend
custom REST server
```

Approved architecture:

```text
Mobile → Supabase → Edge Functions (where necessary)
```

## Reason

- Supabase client CRUD and Edge Functions cover all V1 cloud interaction requirements.
- A custom backend would add deployment, monitoring, and security surface area without V1 product benefit.
- The solo-developer workflow prioritizes low infrastructure cost and operational simplicity.
- Server-side AI, authorization, and validation are handled by Edge Functions, not a separate service.

## Consequences

- No standalone Node/Python/Go API server is deployed for V1.
- Business logic that must run server-side is implemented as Supabase Edge Functions.
- Introducing a custom backend (even for a single endpoint) requires a superseding ADR.
- Redis, background job servers, event streaming, and GraphQL gateways remain out of scope for V1.
