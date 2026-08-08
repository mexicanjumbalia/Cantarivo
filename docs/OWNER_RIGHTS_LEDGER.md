# Cantarivo owner rights ledger

The owner ledger is live in the connected Supabase project under the private `cantarivo_rights` schema (migration `create_private_rights_ledger`). The public, anonymous, and ordinary authenticated roles receive no schema, table, sequence, or view privileges. It is therefore intended for access only through the project owner's authenticated Supabase dashboard or plugin connection.

## Organization

- `assets`: recording, composition, vocal, instrumental, production, and model identification plus master/composition ownership.
- `parties` and `asset_participation`: artists, producers, writers/composers, owners, publishers, administrators, PROs, studios, ownership, participation, attribution, approval, removal, and termination rights.
- `licenses`: license type, territory, platforms, term, interactive/non-interactive use, advertising/subscription/commercial rights, UGC/remix/transformation rights, restrictions, approvals, AI/training/synthetic-vocal terms, reporting, audit, and guarantees.
- `vocal_elements`: stems, harmonies, melodic phrases, hooks, ad-libs, effects, call-and-response, spoken/character performances, acapellas, background vocals, and other original vocal performances.
- `creative_scope`: existing/original productions, instrumentals, stems, techniques, new compositions, vocal arrangements, relationships, studio resources, creative direction, releases, experiences, and future products/services.
- `reporting_periods`, `usage_events`, `royalty_terms`, and `royalty_statements`: qualifying uses, revenue categories, deductions, rates, payable amounts, adjustments, balances, and payment status.
- `audit_log`: owner-managed record of changes and approvals.
- `owner_royalty_ledger`: a compact, owner-only reporting view with duplicated concepts removed.

The included row is marked `TEMPLATE` and is not evidence of ownership, permission, clearance, or payment. Replace it only with source-backed contract and usage data.

The post-migration checks confirmed eleven RLS-protected tables, one owner reporting view, and no `USAGE` or `SELECT` privileges for `public`, `anon`, or `authenticated`. The security advisor's remaining notices are informational because this private schema deliberately has no public policies; performance advisor notices for the new foreign-key indexes are expected until real ledger traffic uses them.

## Access and release rule

Do not put a Supabase service-role key in the Android app, website, repository, or browser storage. If a future owner dashboard is published, use Supabase Auth, MFA, an owner role stored in trusted `app_metadata`, and restrictive RLS policies. Run security and performance advisors after every schema change.
