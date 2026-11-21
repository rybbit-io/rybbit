# SEO working files

Inputs for writing rybbit.com content. The site itself lives in `docs/`.

| Path | What it is |
| --- | --- |
| `keywords.csv` | Keyword backlog: every researched keyword, the one URL that owns it, and whether that page exists |
| `voice/` | Voice kit: how Rybbit writes, what it believes, verified numbers, and stories. Read before drafting |

## keywords.csv

| Column | Meaning |
| --- | --- |
| `keyword` | The search query, lowercase |
| `cluster` | Topic group. Keywords in one cluster usually share a target page |
| `intent` | `informational` (learning), `commercial` (evaluating tools), or `comparison` (alternatives, X vs Y) |
| `us_volume` | Monthly US searches from Ahrefs. Blank when unknown. Some rows are cluster totals; `notes` says so |
| `kd` | Ahrefs keyword difficulty (0-100). Where research gave a range, this is the top of it |
| `cpc` | US cost per click in dollars, when recorded. High CPC means advertisers pay for the click |
| `target_url` | The single rybbit.com path that owns this keyword. Blank for skipped rows |
| `status` | `live`: the target page exists. `todo`: planned, or an existing page needs retargeting (see `notes`). `skip`: not worth pursuing, reason in `notes` |
| `notes` | Reasons, SERP observations, quick wins, and caveats |

### Rules

- **One URL per intent.** `/compare/<x>` owns "rybbit vs x" and the singular "x alternative". `/blog` owns plural listicles ("x alternatives"). The homepage keeps the singular "google analytics alternative". Never create a second page for a keyword that already has a `target_url`.
- **Re-check the SERP before writing.** Volumes, difficulty and the ranking pages are from Ahrefs research on 2026-09-13 and 2026-09-25. They drift within weeks. Look at the current top results before you start a draft, and update the row if the numbers moved.
- **Update the row when you ship.** Set `status` to `live` in the same PR that publishes the page.
- New rows need real data. Leave a number blank rather than guess.

The blog linter (`cd docs && npm run lint:blog`) reads each post's `keyword` frontmatter, which should match a row here.
