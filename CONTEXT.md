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

**Public Website Target**:
A caller-supplied HTTP or HTTPS location that resolves only to public network addresses and can be inspected by Rybbit's free analytics tools.
_Avoid_: External URL, safe URL, validated URL

**Website Inspection**:
An operation that evaluates a Public Website Target using bounded direct acquisition or a remote evaluator.
_Avoid_: URL scan, website fetch
