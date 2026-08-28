# Rybbit

Domain language for Rybbit's analytics product, documentation, and public tools.

## Language

**Site**:
A web domain or mobile application whose activity Rybbit measures for an Organization.
_Avoid_: Website, property

**Site Configuration**:
The mutable identity, visibility, tracking, exclusion, and feature settings attached to a Site.
_Avoid_: Site settings, tracking config

**Site Exclusion Decision**:
The ordered determination that an ingestion request should not be recorded because it matches a Site Configuration exclusion rule.
_Avoid_: Filter result, blocked event

**Site Ingestion Context**:
The authoritative Site Configuration, client identity inputs, trust decision, network lookup, and request time resolved once for a public ingestion request.
_Avoid_: Raw request metadata, client-supplied identity

**Site Import**:
A quota-bound transfer of historical events from a supported analytics platform into a Site, with at most one active transfer per Organization and status tracked through completion or compensated failure.
_Avoid_: Bulk upload, mapper run

**Replay Payload**:
The recorded interaction data for a session replay, placed either inline with its event reference or in object storage and reconstructed through that reference.
_Avoid_: R2 blob, event data string

**Organization Billing**:
The owner-authorized linkage between an Organization, its Stripe customer, and the current Stripe subscription that billing operations act on. Product entitlement selection remains a distinct decision.
_Avoid_: Stripe route logic, subscription utility

**Public Website Target**:
A caller-supplied HTTP or HTTPS location that resolves only to public network addresses and can be inspected by Rybbit's free analytics tools.
_Avoid_: External URL, safe URL, validated URL

**Website Inspection**:
An operation that evaluates a Public Website Target using bounded direct acquisition or a remote evaluator.
_Avoid_: URL scan, website fetch
