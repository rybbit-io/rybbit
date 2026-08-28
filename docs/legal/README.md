# Rybbit transfer documents

This directory contains a counsel-ready draft of Rybbit's EU transfer package.
It is not legal advice and is not executed merely because it exists in the
repository.

## Files

- `rybbit-eu-scc-addendum.md` — prefilled Module Two/Module Three SCC completion
  schedule, Annexes I–III, and signature blocks.
- `rybbit-eu-scc-addendum.docx` — Word version generated from the Markdown draft.
- `source/eu-standard-contractual-clauses-2021-official.doc` — unmodified
  English Annex containing the European Commission's official SCC text.
- `source/eu-scc-implementing-decision-2021-official.doc` — unmodified English
  Commission Implementing Decision downloaded with the SCCs.

Official source:
https://commission.europa.eu/publications/publications-standard-contractual-clauses-sccs_en

SHA-256 checksums at download time:

- SCC Annex: `beb2e873edd0d34edc8c5eca5b688e5d51cb6e6f63d4f7759333a6a26f8bd1de`
- Implementing Decision: `29a194e32353edfba0ad5d74fa1cd595e4ea39a22f7a4664cdafa9fd4f3e3f1c`

## Required before execution or publication

1. Have privacy counsel confirm whether Rybbit's relevant processing falls
   within GDPR Article 3(2), because the 2021 international SCCs are not designed
   for an importer whose relevant processing is already directly subject to the
   GDPR.
2. Decide whether Tomato.gg LLC will certify under the EU-U.S. Data Privacy
   Framework and, if so, update the transfer-mechanism language.
3. Reconcile the post-termination deletion promise: the current DPA says 30
   days; the current Terms and Security page say 60 days.
4. Confirm that each security statement in Annex II matches production,
   especially encryption at rest, backup handling, employee training, and
   deletion propagation.
5. Confirm the complete subprocessor inventory, legal names, processing
   locations, transfer mechanisms, and contracts. In particular, confirm
   OpenRouter/model-provider coverage and Stripe's role.
6. Update the Terms so the DPA and SCC Addendum are expressly part of the
   Agreement and establish an order of precedence.
7. Add a binding acceptance mechanism or obtain signatures. Publishing an
   unsigned document alone does not execute the SCCs.
8. Complete and retain a transfer impact assessment for any transfer relying on
   the SCCs.

