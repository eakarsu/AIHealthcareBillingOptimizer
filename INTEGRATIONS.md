# Integration Readiness

This app now has an integration readiness layer for production planning. It does not inspect credential values.

## Prepared Connectors

- Clearinghouse EDI: 837, 835, 999, 277CA, 276/277.
- Payer API and portal automation: eligibility, claim status, prior-auth status, document follow-up.
- EHR FHIR/HL7 clinical feed: patients, encounters, diagnoses, notes, labs, evidence.
- Secure document storage: attachments, appeal packets, remits, payer letters.
- Patient payment processor: payment intents, webhooks, refunds, reconciliation.
- Notification delivery: email, SMS, fax, webhooks, retries, consent checks.
- Enterprise identity SSO: OIDC/SAML, MFA, role mapping, access review.
- External webhooks: signed outbound events, inbound event verification, retries.
- OpenRouter AI: AI workflows, result persistence, rate limits, review controls.
- Observability: connector health, structured logs, alerts, incident workflow.

## Backend Endpoints

- `GET /api/integrations`
- `GET /api/integrations/:slug`
- `GET /api/integrations/:slug/readiness`
- `POST /api/integrations/:slug/plan`

The readiness endpoint returns required environment variable names and sandbox scenarios. It intentionally returns `not_checked` for credential status.

## Frontend

Open `Integration Readiness` from the sidebar. Select a connector, review required environment names, and generate an AI rollout plan with optional context.

## Go-Live Rule

Treat every connector as prepared, not live, until sandbox credentials, vendor-specific mappings, PHI-safe logging, retries, audit evidence, and regression tests are completed.
