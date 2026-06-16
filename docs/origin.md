# Origin & context

## What this is

speakeasy lets you share confidential content with one person at a time behind an
unguessable URL, then revoke it. You hand someone `https://yoursite.com/<slug>`;
they see a curated set of otherwise-hidden content; anyone without the slug — or
with a deactivated/expired one — gets an identical 404, so a visitor can never
tell a slug existed. You mint, curate, expire, and kill these "variants" from a
local admin dashboard or the CLI. See the [README](../README.md) for the full
picture and the four agnostic seams.

## Where it came from

It was extracted on 2026-06-16 from **ranson.design**, a portfolio site that
used it to show confidential case studies to specific companies during a job
search. The mechanism was always content-neutral — a variant reveals a curated
list of *items* — so it was lifted out and generalized into this standalone,
stack-agnostic project. (Tracked in that project's Linear as POR-127.)

The extraction was a clean copy, not a move: the portfolio kept its working
in-repo implementation untouched so the live site couldn't break. As a result
the portfolio still runs its own older copy of this logic for now.

## One deliberate difference from the portfolio's copy

During generalization the domain vocabulary was renamed:

| | portfolio's original | speakeasy |
| --- | --- | --- |
| Manifest entry field | `projects` | `items` |
| Lookup response | `{ projectIds, projects }` | `{ ids, items }` |

This matters only if you ever wire speakeasy *back* into that portfolio: the live
manifest and client still speak the old vocabulary, so adoption there must be
contract-preserving (handled via the storage-adapter and endpoint seams, not a
field rename). That migration is tracked in the portfolio's Linear as POR-161 and
is intentionally not done yet. For any *other* host, the `items` vocabulary is
just the native one — nothing to worry about.

## Design intent in one line

Security model is **obscurity + curation + lifecycle, not authentication**: there
is no login and no admin surface in production. The deployed site exposes only a
read-only lookup endpoint; all privileged actions happen on the operator's
machine (dev-only Vite plugin or the CLI).
