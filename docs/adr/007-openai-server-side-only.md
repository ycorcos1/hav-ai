# ADR 007: OpenAI Server-Side Only

## Status

Accepted

## Context

havAI V1 includes AI features: Coach, Recommendation Explanation, and Natural-Language Quick Log. These require an OpenAI-compatible provider. API keys must never be exposed to client-side application code or `EXPO_PUBLIC_` environment variables.

## Decision

Access **OpenAI** exclusively through **Supabase Edge Functions**. The OpenAI API key must never exist inside the React Native application.

Correct flow:

```text
Mobile → Supabase Edge Function → OpenAI
```

Incorrect flow:

```text
Mobile → OpenAI directly
```

## Reason

- Server-side-only access prevents API key extraction from mobile binaries or client environment variables.
- Edge Functions enforce authentication, authorization, rate limiting, and input validation before provider calls.
- Server-side configuration (`AI_PROVIDER`, `OPENAI_API_KEY`, model settings) allows model changes without mobile client updates.
- The mobile client receives only validated final responses, not raw provider payloads or secrets.

## Consequences

- `OPENAI_API_KEY` and related AI configuration are server-only secrets.
- Mobile contracts must not include provider-specific types or direct OpenAI SDK usage.
- A mock AI provider supports development and testing without live API calls.
- Direct mobile OpenAI integration or anonymous public AI proxies are prohibited for V1.
