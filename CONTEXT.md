# Rybbit

Domain language for Rybbit's analytics product, documentation, and public tools.

## Language

**Site**:
A web domain or mobile application whose activity Rybbit measures for an Organization.
_Avoid_: Website, property

**Site Configuration**:
The mutable identity, visibility, tracking, exclusion, and feature settings attached to a Site.
_Avoid_: Site settings, tracking config

**Organization Access Decision**:
The operation-specific determination of whether an actor may perform an Organization settings action, preserving active-Organization availability, Organization membership role, global role, and pending or error state.
_Avoid_: Settings guard, role check

**Experiment Authoring**:
The ordered operation that resolves or creates an Experiment's assignment Feature Flag and primary Goal, then creates or updates the Experiment and produces its implementation state.
_Avoid_: Experiment form submission, experiment save flow

**Dashboard Time Preset**:
A well-known named analytics time range whose selector membership and timezone-specific Time value come from the canonical preset groups.
_Avoid_: Date shortcut, time option

**Replay Session**:
The client-owned playback lifecycle for one selected Session Replay, including player readiness, position, playback state, speed, activity periods, and visibility recovery.
_Avoid_: Replay state, player store

**Site Exclusion Decision**:
The ordered determination that an ingestion request should not be recorded because it matches a Site Configuration exclusion rule.
_Avoid_: Filter result, blocked event

**Public Website Target**:
A caller-supplied HTTP or HTTPS location that resolves only to public network addresses and can be inspected by Rybbit's free analytics tools.
_Avoid_: External URL, safe URL, validated URL

**Website Inspection**:
An operation that evaluates a Public Website Target using bounded direct acquisition or a remote evaluator.
_Avoid_: URL scan, website fetch
