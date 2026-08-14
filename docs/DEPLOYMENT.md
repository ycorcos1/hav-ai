# havAI V1 Deployment and Environment Specification

## 1. Purpose

This document defines how havAI is configured, built, tested, and deployed across its lifecycle.

It covers:

- local development
- environment separation
- environment variables
- Supabase environments
- Expo environments
- mobile builds
- database migrations
- Edge Function deployment
- OpenAI secrets
- CI/CD
- release strategy
- rollback expectations
- future App Store distribution
- production-readiness requirements

The goal is to keep V1 extremely cheap and simple while ensuring the project does not require architectural restructuring when it becomes a public product.

---

# 2. Deployment Philosophy

havAI should evolve through deployment stages.

```text
LOCAL DEVELOPMENT
        ↓
PERSONAL TESTING
        ↓
INTERNAL / BETA TESTING
        ↓
PRODUCTION
```

Infrastructure should only be added when the next stage requires it.

Do not build a production deployment system before there is a product worth deploying.

---

# 3. V1 Deployment Goals

During personal development, havAI should:

- cost approximately $0 in infrastructure
- run through Expo
- connect to Supabase
- support real-device development through Expo Go where compatible
- allow local development without production infrastructure
- keep application secrets out of the mobile bundle
- maintain schema changes through migrations
- support future standalone builds without architecture changes

---

# 4. Environment Model

havAI should conceptually support:

```text
development
production
```

Optional later:

```text
preview
test
```

V1 should not create unnecessary infrastructure for every environment immediately.

---

# 5. Initial Environment Strategy

During early personal development:

```text
LOCAL APP
    ↓
DEVELOPMENT SUPABASE PROJECT
    ↓
OPENAI DEVELOPMENT CONFIG
```

One Supabase project is sufficient initially.

The existing project should be treated as:

```text
development
```

even if its current project name is simply:

```text
gym-ai
```

Supabase supports both direct development against a project and more formal local/multi-environment workflows, so starting with a single development project is reasonable.

---

# 6. Future Production Environment

Before havAI is released to external users, create:

```text
havAI Development
havAI Production
```

as separate Supabase projects.

Architecture:

```text
DEVELOPMENT APP
       ↓
havAI Development Supabase


PRODUCTION APP
       ↓
havAI Production Supabase
```

Never allow development builds to modify production workout data.

---

# 7. Why Separate Production

Once real users exist, development work must be able to:

- break schemas
- reset test data
- seed fake workouts
- test migrations
- simulate errors

without affecting actual users.

Therefore production separation becomes mandatory before public distribution.

---

# 8. Environment Definitions

## Development

Purpose:

```text
active coding
Cursor development
Expo Go
debugging
schema development
AI testing
fake/test data
```

Data:

```text
disposable or semi-disposable
```

---

## Production

Purpose:

```text
real users
real workout history
App Store builds
stable AI configuration
```

Data:

```text
must be protected
must never be casually reset
```

---

# 9. Optional Test Environment

Automated tests may use:

```text
local Supabase
```

or a dedicated isolated test project.

Do not run destructive integration tests against production.

Supabase officially supports a local development stack and migration workflow through its CLI.

---

# 10. Optional Preview Environment

When havAI eventually has multiple developers or external beta builds, a preview environment may become useful.

Potential architecture:

```text
feature branch
      ↓
preview backend
      ↓
preview mobile build
```

Not required for personal V1.

---

# 11. Environment Matrix

Recommended eventual structure:

| Environment | Mobile        | Database            | AI               | Users      |
| ----------- | ------------- | ------------------- | ---------------- | ---------- |
| Local/Test  | Expo local    | Local/test Supabase | Mock/OpenAI test | developer  |
| Development | Expo dev      | Dev Supabase        | OpenAI dev       | developer  |
| Preview     | Preview build | Preview/dev backend | OpenAI dev       | testers    |
| Production  | Store build   | Prod Supabase       | OpenAI prod      | real users |

---

# 12. Local Development Architecture

Initial development:

```text
Cursor
   │
   ▼
Expo CLI
   │
   ▼
Expo Go / Simulator
   │
   ▼
Development Supabase
```

Xcode can remain deferred until standalone iPhone development builds become necessary.

---

# 13. Current V1 Device Workflow

While Xcode is unavailable:

```text
Mac
 │
 ├── Cursor
 │
 ├── Expo dev server
 │
 └── source code
       │
       ▼
    Expo Go
       │
       ▼
    iPhone
```

The Mac must remain reachable while using this development-server workflow.

This is acceptable during early implementation.

---

# 14. Future Standalone Device Workflow

Once native build tooling is available:

```text
Source Code
    ↓
Expo / EAS Build
    ↓
Signed Application Binary
    ↓
iPhone
```

Expo's EAS Build service produces standalone application binaries for Expo and React Native projects.

The installed application no longer needs the Mac development server for normal execution.

---

# 15. Deployment Stages

havAI deployment should progress through the following stages.

## Stage 0

```text
Specifications only
```

Current historical phase.

---

## Stage 1

```text
Expo app scaffold
+
Expo Go
+
development Supabase
```

---

## Stage 2

```text
functional local-first app
+
real personal workout data
```

---

## Stage 3

```text
standalone development/internal build
```

---

## Stage 4

```text
small external beta
```

---

## Stage 5

```text
App Store / production release
```

---

# 16. Expo Project Configuration

The Expo project should maintain one stable project identity.

Conceptual:

```text
name
slug
scheme
bundle identifier
EAS project ID
```

These should not change casually after distribution begins.

---

# 17. Bundle Identifier

Before creating standalone iOS builds, choose a stable identifier.

Example:

```text
com.yahavcorcos.havai
```

or equivalent.

This becomes part of the application's iOS identity.

Avoid temporary identifiers once publishing begins.

---

# 18. Android Package

Even though Android is not the V1 priority, define a matching Android package when production configuration begins.

Example:

```text
com.yahavcorcos.havai
```

Using the same namespace concept reduces future cleanup.

---

# 19. Application Configuration

Prefer dynamic Expo configuration where environment-aware behavior is needed.

Conceptually:

```text
app.config.ts
```

instead of relying entirely on static configuration if environment selection becomes necessary.

---

# 20. Public Mobile Environment Variables

Mobile-accessible values may include:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_APP_ENV
```

Expo makes `EXPO_PUBLIC_` variables available to client-side application code, meaning they must never contain secrets.

---

# 21. Never Place Secrets in EXPO_PUBLIC

Never:

```text
EXPO_PUBLIC_OPENAI_API_KEY
```

Never:

```text
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

Never:

```text
EXPO_PUBLIC_DATABASE_PASSWORD
```

Anything bundled into client-side code must be treated as publicly accessible.

---

# 22. Local Environment File

For local development:

```text
.env.local
```

may contain:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`.env.local` must not be committed.

---

# 23. Git Ignore Requirements

At minimum:

```text
.env
.env.local
.env.*.local
```

should be excluded where appropriate.

Never rely only on developer memory to avoid committing credentials.

---

# 24. Example Environment File

Provide:

```text
.env.example
```

containing:

```text
EXPO_PUBLIC_APP_ENV=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No real credentials.

This tells Cursor and future contributors what configuration is required.

---

# 25. Environment Validation

At startup:

```text
load environment
↓
validate required values
↓
fail clearly if misconfigured
```

Do not allow missing environment configuration to result in obscure networking errors later.

---

# 26. Environment Type

Recommended:

```ts
type AppEnvironment = "development" | "preview" | "production";
```

Initial practical usage:

```text
development
```

Later:

```text
production
```

---

# 27. Environment Display

Development builds should optionally display a subtle developer indicator.

Example:

```text
DEV
```

inside a hidden/debug menu.

Production builds should not expose developer controls.

---

# 28. Supabase Environment Variables

Client:

```text
SUPABASE URL
publishable client key
```

Server-side Edge Functions:

```text
OPENAI_API_KEY
AI provider configuration
```

Supabase Edge Functions can access secrets through environment variables.

---

# 29. Supabase Project Roles

## Development Supabase

Can contain:

- seed exercises
- fake users
- personal test account
- incomplete migrations
- debugging data

---

## Production Supabase

Must contain:

- reviewed schema
- reviewed RLS
- production Edge Functions
- production secrets
- real users
- protected workout history

---

# 30. Local Supabase

Once implementation reaches database-heavy development, install and use the Supabase CLI.

Potential workflow:

```text
supabase start
```

provides local services.

Then:

```text
migration
↓
local test
↓
development project
↓
production
```

Supabase recommends migration-driven local development so schema changes can be reproduced and version-controlled.

---

# 31. Database Migration Rule

All schema changes must originate from migration files.

Correct:

```text
modify migration/schema
↓
test
↓
commit
↓
deploy
```

Avoid:

```text
open production dashboard
↓
manually add column
↓
forget to update repository
```

---

# 32. Migration Source of Truth

Directory:

```text
supabase/migrations/
```

becomes the schema history.

Supabase branching also depends on migration history, which is another reason to keep migrations complete and committed.

---

# 33. Migration Promotion Path

Eventually:

```text
LOCAL
  ↓
DEVELOPMENT
  ↓
PRODUCTION
```

A migration should never be tested for the first time against production.

---

# 34. Production Migration Review

Before production migration:

- migration applies cleanly locally
- integration tests pass
- RLS tests pass
- migration is backwards-compatible with deployed app where required
- backup/recovery implications understood

---

# 35. Destructive Migration Rule

Avoid destructive production changes such as:

```text
drop column
rename required column
change unit semantics
```

in one step.

Prefer:

```text
add replacement
↓
deploy compatible app
↓
migrate data
↓
remove old field later
```

---

# 36. Edge Function Deployment

Functions:

```text
coach
explain-recommendation
parse-workout
```

should live in:

```text
supabase/functions/
```

and be deployed through version-controlled source.

---

# 37. Edge Function Environment Separation

Development function:

```text
development Supabase
development OPENAI_API_KEY
```

Production function:

```text
production Supabase
production OPENAI_API_KEY
```

Never share production secrets unnecessarily with development.

---

# 38. OpenAI Development Strategy

Early stages may use:

```text
AI_PROVIDER=mock
```

This supports development without API usage.

Then:

```text
AI_PROVIDER=openai
```

when real AI testing begins.

---

# 39. AI Configuration Variables

Possible server-side configuration:

```text
OPENAI_API_KEY
AI_PROVIDER
AI_COACH_MODEL
AI_EXPLANATION_MODEL
AI_PARSER_MODEL
```

Model selection should not require a mobile release.

---

# 40. Prompt Deployment

AI prompts are source code.

Example:

```text
supabase/functions/_shared/prompts/
```

Prompt changes should be:

```text
committed
reviewed
deployed
versioned
```

not manually changed in an untracked external console.

---

# 41. Prompt Version

Production responses may internally track:

```text
coach-v1
parser-v1
explanation-v1
```

This makes rollback/debugging possible.

---

# 42. Expo Build Profiles

Once EAS is configured, recommended profiles:

```text
development
preview
production
```

EAS uses `eas.json` to define build configuration, and current EAS configuration supports environment-specific build settings.

---

# 43. Conceptual eas.json

Eventually:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview"
    },
    "production": {
      "environment": "production"
    }
  }
}
```

Exact fields must be validated against the Expo version in use when implemented.

---

# 44. Development Build

Purpose:

```text
debugging
native module testing
developer tools
```

Not intended for App Store users.

---

# 45. Preview Build

Purpose:

```text
real-device testing
friends/testers
release candidate validation
```

Should connect to:

```text
development
```

or later:

```text
preview
```

backend, never production unless explicitly intended.

---

# 46. Production Build

Purpose:

```text
App Store / Play Store
real users
```

Must connect only to:

```text
production Supabase
```

---

# 47. Build-Time Environment Safety

A production binary connecting to development Supabase is a serious deployment error.

Likewise:

```text
development build
→ production database
```

can accidentally corrupt real data.

Environment wiring must therefore be explicit and testable.

---

# 48. Environment Assertion

At application startup, development builds may log:

```text
havAI environment: development
Supabase project: development
```

Production should internally assert:

```text
APP_ENV === production
```

with production configuration.

---

# 49. Supabase Project Guard

Optionally define:

```text
EXPO_PUBLIC_EXPECTED_SUPABASE_PROJECT_REF
```

or equivalent internal validation so the client can detect accidental environment mismatch.

Not required immediately, but useful before production.

---

# 50. EAS Environment Variables

When EAS Build is introduced, Expo's EAS environment-variable system should hold build-specific variables.

Expo currently supports development, preview, and production environment-variable sets across EAS services.

---

# 51. Important CI/EAS Variable Distinction

If EAS performs the cloud build, mobile build variables must be available to the EAS build environment.

Simply placing a value in a GitHub Actions secret does not automatically make it available to the EAS builder. Expo explicitly documents this distinction.

---

# 52. EAS Update

Future builds may use:

```text
EAS Update
```

for JavaScript/assets updates that do not require native binary changes.

Expo's current EAS Update workflow supports publishing updates to channels and selecting an EAS environment.

Not required for initial V1.

---

# 53. Update Channels

Potential future channels:

```text
development
preview
production
```

Do not publish development JavaScript to production users.

---

# 54. Native vs OTA Change

Changes involving native code or native configuration may require a new binary.

Changes limited to compatible JavaScript/assets may potentially use EAS Update later.

Do not rely on OTA deployment as the only release mechanism.

---

# 55. Runtime Compatibility

Before adopting EAS Update heavily, configure runtime compatibility intentionally so an update cannot be delivered to an incompatible binary.

This becomes important once native modules change.

---

# 56. Git Strategy

Recommended simple workflow:

```text
main
```

plus feature branches.

Example:

```text
feature/workout-logging
feature/progression-engine
fix/offline-set-duplication
```

For a small project, feature branches merged into `main` are sufficient. Simple branch-to-main workflows are commonly recommended when team complexity does not justify more elaborate branching.

---

# 57. Main Branch Meaning

During personal development:

```text
main = latest stable development state
```

Later:

```text
main = releasable application state
```

Do not introduce:

```text
develop
staging
release/*
```

branches unless there is a real need.

---

# 58. Git Tags

Production releases should eventually receive tags.

Example:

```text
v1.0.0
v1.0.1
v1.1.0
```

This makes app/backend versions easier to correlate.

---

# 59. Versioning

Use semantic-style application releases:

```text
major.minor.patch
```

Example:

```text
1.0.0
```

Meaning:

```text
major
breaking/product-scale release

minor
new backwards-compatible features

patch
bug fixes
```

---

# 60. Internal Build Number

Mobile platforms also require incrementing native build/version identifiers.

These should be managed through Expo/EAS configuration once actual distribution begins.

---

# 61. Development Version

During early development:

```text
0.x.x
```

is appropriate.

Example:

```text
0.1.0
```

---

# 62. First Public Version

Eventually:

```text
1.0.0
```

when havAI meets the defined V1 release criteria.

---

# 63. CI Philosophy

Do not deploy blindly from every commit.

CI should first become a quality gate.

Initial CI:

```text
push / pull request
       ↓
install
       ↓
typecheck
       ↓
lint
       ↓
tests
```

---

# 64. Initial GitHub Actions

Recommended first workflow:

```text
.github/workflows/ci.yml
```

Runs:

```text
npm install / clean install
typecheck
lint
unit tests
selected integration tests
```

---

# 65. CI Does Not Need To Deploy Initially

During personal development:

```text
CI
→ validate
```

Deployment can remain manual.

This avoids spending time debugging automation before the product exists.

---

# 66. Future Deployment Automation

Later:

```text
merge main
↓
CI
↓
tests
↓
deploy development backend
```

Production should remain deliberately gated.

---

# 67. GitHub Environments

When production automation is introduced, GitHub deployment environments can provide environment-specific secrets and deployment controls. GitHub supports named deployment targets such as development and production, along with branch restrictions and protection rules.

This is future scope.

---

# 68. Private Repository Consideration

GitHub environment-secret capabilities differ by plan and repository visibility, so do not design V1 around paid GitHub environment features unless needed.

Repository-level Actions secrets are enough for basic CI if required.

---

# 69. Production Deployment Should Be Explicit

Do not automatically deploy production because:

```text
main changed
```

during early public release stages.

Recommended:

```text
merge
↓
CI passes
↓
manual release command/workflow
↓
production deployment
```

---

# 70. Deployment Order

When a release includes both backend and mobile changes, deployment order matters.

Prefer backwards-compatible backend changes first.

Typical:

```text
1. database additive migration
2. Edge Functions
3. mobile release
4. destructive cleanup much later
```

---

# 71. Database Before Client Rule

If the new client requires a new database field:

Deploy:

```text
database field
```

before:

```text
mobile build requiring field
```

Because users may receive the new client immediately.

---

# 72. Client Compatibility Window

Once publicly distributed, old clients may remain installed.

Backend should tolerate:

```text
current app
previous app
```

for a reasonable transition period.

Do not immediately remove fields older versions require.

---

# 73. Edge Function Compatibility

Edge Functions should avoid breaking existing contract versions.

If needed:

```text
coach-v1
coach-v2
```

can coexist temporarily.

Do not change field meaning silently.

---

# 74. Release Candidate Flow

Before production:

```text
feature complete
↓
CI passes
↓
preview/internal build
↓
physical device tests
↓
offline test
↓
real gym test
↓
release candidate
↓
production
```

---

# 75. Personal Development Release Gate

Before using havAI as the primary gym tracker:

- active workout survives restart
- offline logging works
- sync works
- no duplicate sets
- progression engine tests pass
- previous history works
- workout summary works

No store deployment is necessary.

---

# 76. Preview Release Gate

Before giving havAI to friends:

- authentication stable
- RLS verified
- environment separation established
- no production secrets in client
- AI authorization verified
- migration path tested
- crash behavior acceptable

---

# 77. Production Release Gate

Before App Store submission:

- separate production Supabase
- production RLS tests pass
- production OpenAI secret configured
- production Edge Functions deployed
- production migrations applied
- production build validated
- no development/debug UI
- privacy requirements reviewed
- external beta completed
- app recovery/offline tests passed
- production backup/recovery plan understood

---

# 78. Deployment Checklist

Every production release should eventually check:

```text
[ ] CI passes
[ ] database migrations reviewed
[ ] migrations tested against development
[ ] Edge Functions tested
[ ] environment variables verified
[ ] production Supabase target verified
[ ] OpenAI production key present
[ ] build version incremented
[ ] physical-device smoke test passed
[ ] offline workout smoke test passed
[ ] release notes prepared
```

---

# 79. Development Database Data

Development may contain:

```text
fake workouts
seed workouts
resettable test users
manual debug records
```

This data should never migrate to production.

Only:

```text
schema
system exercise seeds
required configuration
```

are promoted.

---

# 80. Production Seed Data

Production seed should contain stable system data only.

Example:

```text
system exercises
```

Do not seed fake workout history.

---

# 81. System Exercise Deployment

Built-in exercises should use stable identifiers.

This keeps references consistent across:

```text
development
production
tests
```

---

# 82. Data Backup

Before public production, database backup behavior and recovery should be documented.

During personal development, losing development data is inconvenient but survivable.

Production user workout data is not.

---

# 83. Local Data vs Cloud Backup

SQLite protects:

```text
active/offline workout
```

Supabase protects:

```text
synchronized long-term history
```

They complement each other.

Neither replaces responsible production backups once external users exist.

---

# 84. Rollback Categories

There are three main rollback scenarios.

```text
mobile rollback
backend rollback
database rollback
```

They require different strategies.

---

# 85. Mobile Rollback

After public distribution, users cannot always be forced to downgrade instantly.

Therefore:

```text
backend backwards compatibility
```

is often more useful than assuming a mobile rollback solves everything.

---

# 86. JavaScript Update Rollback

If using EAS Update later, compatible JavaScript updates may be rolled back more quickly than native App Store binaries.

This is a future operational advantage, not a V1 requirement.

---

# 87. Edge Function Rollback

Keep prior function source in Git history.

If a production function breaks:

```text
checkout known-good code
↓
redeploy
```

Prompt versions should also be recoverable.

---

# 88. Database Rollback

Do not assume every migration can simply be reversed.

For production data:

```text
forward fix
```

is often safer than destructive rollback.

Migrations must therefore receive more caution than application code.

---

# 89. Feature Flags

Potentially risky functionality should be disableable.

Examples:

```text
AI Coach
natural-language parsing
recommendation explanation
```

Config:

```ts
{
  coach: true,
  parser: false,
  explanation: true
}
```

---

# 90. Why Feature Flags Matter

If:

```text
OpenAI API issue
```

or:

```text
parser bug
```

occurs, we should be able to disable the feature without disabling workout logging.

---

# 91. Critical Core Features Cannot Depend on Flags

Never make:

```text
workout logging
SQLite
sync recovery
```

optional remote-controlled functionality in V1.

These are core application behaviors.

---

# 92. Logging by Environment

Development:

```text
verbose diagnostics
```

Production:

```text
minimal structured logs
```

Never log:

```text
tokens
passwords
secret keys
full sensitive payloads
```

---

# 93. Debug Screen

Development build may contain hidden:

```text
Environment
Supabase project
App version
Local DB version
Pending sync count
Last sync
AI provider
```

This will be useful during gym testing.

---

# 94. Production Debug Screen

Production may eventually retain a limited diagnostics screen, but no destructive developer controls.

Do not expose:

```text
clear database
simulate offline
modify environment
```

to production users.

---

# 95. Crash Monitoring

Not required initially.

Before external beta, consider:

```text
Sentry
```

or equivalent.

The core architecture should use a logger abstraction so adding crash reporting does not require rewriting features.

---

# 96. Analytics

Not required initially.

Before public release, a lightweight analytics system may track:

```text
workout_started
workout_completed
set_logged
recommendation_viewed
coach_used
```

No analytics system should contain secret or unnecessary raw workout content.

---

# 97. Cost Strategy

Personal development should use:

```text
Expo free tooling where possible
Supabase free tier
GitHub
OpenAI usage only when invoked
```

No:

```text
paid hosting
custom server
Vercel
Redis
monitoring subscription
```

is required.

---

# 98. Cost Expansion Triggers

Upgrade infrastructure only when justified.

Examples:

```text
Supabase limits become relevant
AI usage increases
external testers require distribution
production monitoring becomes necessary
```

Avoid paying based on hypothetical future scale.

---

# 99. Vercel

Not part of the mobile V1 architecture.

Potential future use:

```text
marketing website
web dashboard
admin interface
```

The mobile app does not need Vercel.

---

# 100. Custom Backend

Not deployed in V1.

Architecture remains:

```text
Expo Mobile
   ↓
Supabase
   ↓
Edge Functions
   ↓
OpenAI
```

No:

```text
EC2
ECS
Lambda API layer
Express server
```

is necessary.

---

# 101. AWS

Not required for V1.

Even though AWS could host this architecture, introducing it would create unnecessary:

```text
infrastructure
cost
IAM complexity
deployment code
monitoring
```

without solving a current problem.

---

# 102. Production Evolution

If havAI grows significantly, future architecture may introduce additional infrastructure.

Possible reasons:

```text
large analytics workloads
custom recommendation services
background processing
heavy AI orchestration
```

The V1 deployment strategy should not optimize for this prematurely.

---

# 103. EAS Configuration Timing

Do not configure full EAS deployment until:

```text
basic Expo application exists
```

and:

```text
standalone build testing is actually needed
```

This remains deferred.

---

# 104. Xcode Timing

Xcode remains deferred until one of these becomes necessary:

```text
local iPhone build
custom native development
standalone physical-device build workflow
App Store preparation
```

Its absence does not block current specification or initial Expo implementation.

---

# 105. Apple Developer Program Timing

Do not purchase solely to begin building.

Purchase when:

```text
distribution workflow genuinely requires it
```

such as serious external iOS beta or App Store publication.

---

# 106. TestFlight Timing

Introduce TestFlight when:

```text
external iPhone testers
```

become useful.

Do not make it part of initial personal V1 deployment.

---

# 107. App Store Timing

App Store preparation begins only after:

```text
real personal usage
stable offline behavior
stable progression behavior
successful beta
```

The goal is to validate the product before paying the distribution overhead.

---

# 108. Development Workflow

Normal feature development:

```text
Create branch
↓
Implement
↓
Test
↓
Run through Expo
↓
Commit
↓
Merge to main
```

No deployment automation required for every feature.

---

# 109. Database Development Workflow

```text
create migration
↓
apply locally/test
↓
run database tests
↓
commit migration
↓
apply to development Supabase
```

Later:

```text
approved migration
↓
production
```

---

# 110. Edge Function Workflow

```text
implement locally
↓
mock/test
↓
test against development
↓
deploy to development Supabase
↓
verify
```

Later:

```text
deploy same reviewed source to production
```

---

# 111. Production AI Workflow

When changing:

```text
model
prompt
context strategy
```

test with AI eval fixtures first.

Do not experiment directly against production user experiences.

---

# 112. Production Prompt Change

Recommended:

```text
prompt change
↓
prompt version increment
↓
eval
↓
development deploy
↓
manual validation
↓
production deploy
```

---

# 113. Production Model Change

Same principle.

Changing:

```text
AI_COACH_MODEL
```

should be treated as a deployment event because output quality, latency, and cost may change.

---

# 114. Deployment Failure Philosophy

A deployment failure must not endanger workout history.

The strongest protection comes from:

```text
SQLite local-first
+
backwards-compatible cloud schema
```

Even if an AI or cloud deployment is temporarily broken, active workout logging should remain functional.

---

# 115. Production Outage Behavior

## Supabase unavailable

Expected:

```text
workout continues locally
sync queues
```

---

## OpenAI unavailable

Expected:

```text
Coach unavailable
core app works
```

---

## AI Edge Function broken

Expected:

```text
AI unavailable
core app works
```

---

## New app bug

Expected protection:

```text
local persistence
recoverable active session
```

where possible.

---

# 116. Environment Security

Production credentials must only exist where required.

```text
Mobile:
public Supabase configuration

Supabase server:
OpenAI secret

CI:
only deployment credentials genuinely needed
```

Do not replicate every secret across every service.

---

# 117. Least Privilege

CI/CD credentials should have only the permissions needed to deploy the relevant service.

Do not use broad personal credentials where limited deployment credentials are available.

This becomes important before public production.

---

# 118. Production Access

During personal development:

```text
developer = owner
```

Later, if collaborators join:

```text
production access
```

should be restricted more carefully than development access.

---

# 119. Environment Documentation

README should eventually include:

```text
Development setup
Required environment variables
How to start Expo
How to start local Supabase
How to run migrations
How to deploy functions
How to run tests
```

Production deployment commands should live in controlled documentation.

---

# 120. No Manual Mystery Steps

A new environment should be reproducible from:

```text
Git repository
+
documented credentials/configuration
```

not:

> There was a table I manually created six months ago.

Everything structural belongs in source control.

---

# 121. Development Setup Goal

Eventually a clean machine should be able to run approximately:

```text
clone repo
↓
install dependencies
↓
configure environment
↓
start Supabase
↓
apply migrations
↓
start Expo
```

and obtain a working development environment.

---

# 122. Production Infrastructure as Code

Full infrastructure-as-code is unnecessary in V1 because Supabase and Expo manage most infrastructure.

Database migrations and application configuration already provide most required reproducibility.

Do not introduce Terraform solely for architectural appearance.

---

# 123. Deployment Script Philosophy

Common commands should eventually be placed into:

```text
package.json scripts
```

or clear tooling scripts.

Example conceptual commands:

```text
npm run dev
npm run test
npm run typecheck
npm run db:start
npm run db:migrate
npm run functions:serve
```

Exact commands depend on scaffolding.

---

# 124. Dangerous Production Commands

Production migration/deploy scripts should not be named ambiguously.

Prefer:

```text
deploy:production
```

over:

```text
deploy
```

once production exists.

Make destructive intent obvious.

---

# 125. Production Confirmation

During early releases, production database deployment should require explicit human action.

Do not make:

```text
git push
```

equivalent to:

```text
modify production database
```

without mature deployment controls.

---

# 126. Rollout Strategy

First public release should be gradual.

Conceptually:

```text
personal usage
↓
1-5 testers
↓
small beta
↓
broader beta
↓
public
```

This gives sync, AI, and progression issues time to surface.

---

# 127. Production Data Migration

When development data has been useful for personal testing, do not simply clone the entire development database into production.

Decide deliberately whether personal workout history should be migrated.

System schema and seed data should be reproducible independently.

---

# 128. Personal User Migration

If desired before production:

```text
export personal workout history
↓
create production account
↓
controlled import
```

can be implemented.

Not required now.

---

# 129. Release Notes

Once beta testing begins, track release notes.

Example:

```text
0.4.0

Added:
- offline workout completion

Fixed:
- duplicate sets after network reconnect
```

This helps correlate bugs with versions.

---

# 130. Schema Version Diagnostics

Debug diagnostics should expose:

```text
local SQLite schema version
cloud migration/version identifier if practical
```

This makes upgrade bugs easier to investigate.

---

# 131. App Version Diagnostics

Always make available internally:

```text
app version
build number
environment
```

Useful when testers report issues.

---

# 132. Deployment Acceptance Tests

After a development deployment:

Test:

```text
authentication
template fetch
start workout
set write
sync
Edge Function invocation
```

Before production:

run the full release checklist from the testing specification.

---

# 133. Production Smoke Test

Immediately after production deployment:

```text
login test account
↓
load exercises
↓
start disposable test workout
↓
log test set
↓
verify sync
↓
invoke Coach
↓
delete test data
```

Never use real user data for deployment smoke testing.

---

# 134. Deployment Definition of Done

The V1 deployment architecture is complete when:

- local development environment is reproducible
- development Supabase is configured
- environment variables are validated
- secrets are not present in mobile code
- database migrations are source-controlled
- system exercise seeds are source-controlled
- Edge Functions are source-controlled
- development Edge Functions can be deployed
- OpenAI keys live server-side
- Expo application connects to correct environment
- CI runs typecheck/tests
- standalone build path is documented
- production environment plan exists
- production Supabase can be introduced without architecture changes
- deployment does not compromise offline workout behavior
- development and production can eventually be cleanly separated

---

# 135. Current V1 Environment

At the current project stage, the practical deployment architecture is:

```text
┌────────────────────────────┐
│        Developer Mac       │
│                            │
│ Cursor                     │
│ Git                        │
│ Node                       │
│ Expo CLI                   │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│       Expo Go / iPhone     │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│   Development Supabase     │
│                            │
│ PostgreSQL                 │
│ Auth                       │
│ Edge Functions             │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│          OpenAI            │
│     when explicitly used   │
└────────────────────────────┘
```

No additional production infrastructure is required yet.

---

# 136. Future Production Architecture

```text
                         GITHUB
                            │
                       CI / Release
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
       EXPO / EAS                   SUPABASE PROD
            │                               │
      Mobile Binary                 PostgreSQL
            │                       Auth
            │                       Edge Functions
            │                               │
            ▼                               ▼
        USER PHONE                       OPENAI
            │
            │
            └───────────────┐
                            │
                            ▼
                     SUPABASE PROD
```

---

# 137. Environment Promotion Model

```text
CODE
 │
 ▼
LOCAL TEST
 │
 ▼
DEVELOPMENT
 │
 ▼
PREVIEW / BETA
 │
 ▼
PRODUCTION
```

Database migrations, application code, Edge Functions, and AI prompts all follow the same conceptual promotion direction.

---

# 138. Final Deployment Principle

havAI deployment should remain boring.

The difficult parts of this product should be:

```text
workout experience
offline reliability
progression quality
AI usefulness
```

not:

```text
managing ten cloud services
maintaining Kubernetes
debugging custom CI infrastructure
paying for idle servers
```

V1 should therefore use the smallest deployment footprint capable of supporting the product correctly:

```text
Expo
+
Supabase
+
OpenAI
+
GitHub
```

Nothing else should be added without a concrete problem that requires it.
