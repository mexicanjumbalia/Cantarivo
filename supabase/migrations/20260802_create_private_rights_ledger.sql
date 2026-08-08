-- Cantarivo owner-only rights and royalty ledger.
-- This schema is intentionally not exposed through the public Data API.

create extension if not exists pgcrypto;
create schema if not exists cantarivo_rights;

revoke all on schema cantarivo_rights from public, anon, authenticated;

create table if not exists cantarivo_rights.parties (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  party_type text not null check (party_type in (
    'artist', 'producer', 'songwriter_composer', 'rights_owner', 'publisher',
    'administrator', 'performing_rights_organization', 'mechanical_rights_holder',
    'studio', 'licensee', 'other'
  )),
  pro_affiliation text,
  publisher_administrator text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cantarivo_rights.assets (
  id uuid primary key default gen_random_uuid(),
  asset_identifier text not null unique,
  title text not null,
  asset_type text not null check (asset_type in (
    'master_recording', 'musical_composition', 'vocal_performance', 'vocal_stem',
    'instrumental', 'production', 'model', 'other'
  )),
  artist_display text,
  producer_display text,
  songwriter_composer_display text,
  rights_owner_display text,
  publisher_display text,
  isrc text,
  iswc text,
  master_recording_ownership text,
  musical_composition_ownership text,
  territory text,
  term_start date,
  term_end date,
  status text not null default 'draft' check (status in ('template', 'draft', 'review', 'cleared', 'expired', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cantarivo_rights.asset_participation (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  party_id uuid not null references cantarivo_rights.parties(id) on delete restrict,
  role text not null,
  ownership_percent numeric(7,4) check (ownership_percent between 0 and 100),
  participation_percent numeric(7,4) check (participation_percent between 0 and 100),
  attribution_requirement text,
  approval_rights text,
  removal_rights text,
  termination_rights text,
  notes text,
  unique (asset_id, party_id, role)
);

create table if not exists cantarivo_rights.licenses (
  id uuid primary key default gen_random_uuid(),
  license_identifier text not null unique,
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  licensor_party_id uuid references cantarivo_rights.parties(id) on delete restrict,
  licensee_party_id uuid references cantarivo_rights.parties(id) on delete restrict,
  license_type text not null,
  territory text,
  countries_territories text[],
  platforms text[],
  term_start date,
  term_end date,
  use_types text[],
  interactive_use boolean not null default false,
  non_interactive_use boolean not null default false,
  advertising_use boolean not null default false,
  subscription_use boolean not null default false,
  other_commercial_exploitation boolean not null default false,
  promotional_rights boolean not null default false,
  user_generated_content_rights boolean not null default false,
  remix_rights boolean not null default false,
  transformation_rights boolean not null default false,
  permitted_uses text,
  prohibited_uses text,
  territory_restrictions text,
  time_limitations text,
  content_restrictions text,
  brand_safety_requirements text,
  voice_use_limitations text,
  training_model_permissions text,
  synthetic_vocal_permissions text,
  ai_restrictions text,
  attribution_requirements text,
  approval_rights text,
  removal_procedures text,
  termination_provisions text,
  reporting_requirements text,
  audit_rights text,
  minimum_guarantee numeric(18,6),
  currency char(3),
  status text not null default 'draft' check (status in ('template', 'draft', 'review', 'active', 'expired', 'terminated', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cantarivo_rights.vocal_elements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  element_type text not null check (element_type in (
    'vocal_stem', 'harmony', 'melodic_phrase', 'hook', 'ad_lib', 'vocal_effect',
    'call_and_response', 'spoken_phrase', 'character_performance',
    'acapella_recording', 'background_vocal', 'other_original_vocal_performance'
  )),
  description text,
  permitted_uses text,
  prohibited_uses text,
  training_model_permissions text,
  synthetic_vocal_permissions text,
  geographic_restrictions text,
  duration_limit text,
  composition_reference text,
  attribution_requirement text,
  approval_rights text,
  removal_rights text,
  termination_rights text
);

create table if not exists cantarivo_rights.creative_scope (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  scope_type text not null check (scope_type in (
    'existing_production', 'original_production', 'instrumental', 'stem',
    'production_technique', 'new_composition', 'original_vocal_arrangement',
    'artist_relationship', 'studio_resource', 'creative_direction',
    'new_music_experience', 'interactive_performance', 'original_vocal_content',
    'exclusive_release', 'artist_designed_experience', 'future_product_or_service'
  )),
  description text not null,
  party_id uuid references cantarivo_rights.parties(id) on delete restrict,
  rights_notes text
);

create table if not exists cantarivo_rights.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  period_label text not null unique,
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);

create table if not exists cantarivo_rights.usage_events (
  id uuid primary key default gen_random_uuid(),
  reporting_period_id uuid not null references cantarivo_rights.reporting_periods(id) on delete restrict,
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  license_id uuid references cantarivo_rights.licenses(id) on delete restrict,
  platform text,
  country_territory text,
  use_type text not null,
  interactive boolean not null default false,
  number_of_qualifying_uses bigint not null default 0 check (number_of_qualifying_uses >= 0),
  gross_applicable_revenue numeric(18,6) not null default 0,
  advertising_revenue numeric(18,6) not null default 0,
  subscription_revenue numeric(18,6) not null default 0,
  other_commercial_revenue numeric(18,6) not null default 0,
  contractual_deductions numeric(18,6) not null default 0,
  currency char(3) not null default 'USD',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists cantarivo_rights.royalty_terms (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references cantarivo_rights.licenses(id) on delete restrict,
  payee_party_id uuid not null references cantarivo_rights.parties(id) on delete restrict,
  royalty_percentage numeric(9,6) not null check (royalty_percentage between 0 and 100),
  artist_participation text,
  publisher_participation text,
  vocal_licensing text,
  minimum_guarantee numeric(18,6),
  currency char(3),
  reporting_requirements text,
  audit_rights text,
  effective_from date,
  effective_through date
);

create table if not exists cantarivo_rights.royalty_statements (
  id uuid primary key default gen_random_uuid(),
  reporting_period_id uuid not null references cantarivo_rights.reporting_periods(id) on delete restrict,
  asset_id uuid not null references cantarivo_rights.assets(id) on delete restrict,
  license_id uuid references cantarivo_rights.licenses(id) on delete restrict,
  payee_party_id uuid references cantarivo_rights.parties(id) on delete restrict,
  number_of_qualifying_uses bigint not null default 0,
  gross_applicable_revenue numeric(18,6) not null default 0,
  contractual_deductions numeric(18,6) not null default 0,
  royalty_percentage numeric(9,6) not null default 0,
  amount_payable numeric(18,6) not null default 0,
  adjustments numeric(18,6) not null default 0,
  balance_carried_forward numeric(18,6) not null default 0,
  currency char(3) not null default 'USD',
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'paid', 'disputed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists cantarivo_rights.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor text not null default current_user,
  action text not null,
  record_type text not null,
  record_id text,
  details jsonb not null default '{}'::jsonb
);

alter table cantarivo_rights.parties enable row level security;
alter table cantarivo_rights.assets enable row level security;
alter table cantarivo_rights.asset_participation enable row level security;
alter table cantarivo_rights.licenses enable row level security;
alter table cantarivo_rights.vocal_elements enable row level security;
alter table cantarivo_rights.creative_scope enable row level security;
alter table cantarivo_rights.reporting_periods enable row level security;
alter table cantarivo_rights.usage_events enable row level security;
alter table cantarivo_rights.royalty_terms enable row level security;
alter table cantarivo_rights.royalty_statements enable row level security;
alter table cantarivo_rights.audit_log enable row level security;

revoke all on all tables in schema cantarivo_rights from public, anon, authenticated;
revoke all on all sequences in schema cantarivo_rights from public, anon, authenticated;
alter default privileges in schema cantarivo_rights revoke all on tables from public, anon, authenticated;
alter default privileges in schema cantarivo_rights revoke all on sequences from public, anon, authenticated;

create or replace view cantarivo_rights.owner_royalty_ledger
with (security_invoker = true)
as
select
  rs.id as statement_id,
  rp.period_label as reporting_period,
  a.asset_identifier as licensed_asset,
  a.title as asset_title,
  a.artist_display as artist,
  a.producer_display as producer,
  a.songwriter_composer_display as songwriter_composer,
  a.rights_owner_display as rights_owner,
  a.publisher_display as publisher,
  l.license_type,
  l.territory,
  l.platforms,
  rs.number_of_qualifying_uses,
  rs.gross_applicable_revenue,
  rs.contractual_deductions,
  rs.royalty_percentage,
  rs.amount_payable,
  rs.adjustments,
  rs.balance_carried_forward,
  rs.currency,
  rs.status
from cantarivo_rights.royalty_statements rs
join cantarivo_rights.reporting_periods rp on rp.id = rs.reporting_period_id
join cantarivo_rights.assets a on a.id = rs.asset_id
left join cantarivo_rights.licenses l on l.id = rs.license_id;

revoke all on cantarivo_rights.owner_royalty_ledger from public, anon, authenticated;

-- Cover every foreign key used by the owner ledger so reporting and cleanup stay predictable.
create index if not exists asset_participation_asset_id_idx on cantarivo_rights.asset_participation (asset_id);
create index if not exists asset_participation_party_id_idx on cantarivo_rights.asset_participation (party_id);
create index if not exists licenses_asset_id_idx on cantarivo_rights.licenses (asset_id);
create index if not exists licenses_licensor_party_id_idx on cantarivo_rights.licenses (licensor_party_id);
create index if not exists licenses_licensee_party_id_idx on cantarivo_rights.licenses (licensee_party_id);
create index if not exists vocal_elements_asset_id_idx on cantarivo_rights.vocal_elements (asset_id);
create index if not exists creative_scope_asset_id_idx on cantarivo_rights.creative_scope (asset_id);
create index if not exists creative_scope_party_id_idx on cantarivo_rights.creative_scope (party_id);
create index if not exists usage_events_reporting_period_id_idx on cantarivo_rights.usage_events (reporting_period_id);
create index if not exists usage_events_asset_id_idx on cantarivo_rights.usage_events (asset_id);
create index if not exists usage_events_license_id_idx on cantarivo_rights.usage_events (license_id);
create index if not exists royalty_terms_license_id_idx on cantarivo_rights.royalty_terms (license_id);
create index if not exists royalty_terms_payee_party_id_idx on cantarivo_rights.royalty_terms (payee_party_id);
create index if not exists royalty_statements_reporting_period_id_idx on cantarivo_rights.royalty_statements (reporting_period_id);
create index if not exists royalty_statements_asset_id_idx on cantarivo_rights.royalty_statements (asset_id);
create index if not exists royalty_statements_license_id_idx on cantarivo_rights.royalty_statements (license_id);
create index if not exists royalty_statements_payee_party_id_idx on cantarivo_rights.royalty_statements (payee_party_id);

insert into cantarivo_rights.assets (
  asset_identifier, title, asset_type, artist_display, producer_display,
  songwriter_composer_display, rights_owner_display, publisher_display,
  master_recording_ownership, musical_composition_ownership, territory, status, notes
)
values (
  'CANTARIVO-TEMPLATE-001', 'TEMPLATE — replace before commercial use',
  'vocal_performance', 'Artist TBD', 'Producer TBD', 'Writer/Composer TBD',
  'Owner TBD', 'Publisher TBD', 'Unverified', 'Unverified', 'Worldwide — verify',
  'template', 'Demonstration row only. It is not a rights clearance or a licensed asset.'
)
on conflict (asset_identifier) do nothing;

insert into cantarivo_rights.reporting_periods (period_label, starts_on, ends_on)
values ('2026-Q3 TEMPLATE', date '2026-07-01', date '2026-09-30')
on conflict (period_label) do nothing;

insert into cantarivo_rights.royalty_statements (
  reporting_period_id, asset_id, number_of_qualifying_uses,
  gross_applicable_revenue, contractual_deductions, royalty_percentage,
  amount_payable, adjustments, balance_carried_forward, status, notes
)
select rp.id, a.id, 0, 0, 0, 0, 0, 0, 0, 'draft',
  'Template only; replace with verified contract and usage data.'
from cantarivo_rights.reporting_periods rp
join cantarivo_rights.assets a on a.asset_identifier = 'CANTARIVO-TEMPLATE-001'
where rp.period_label = '2026-Q3 TEMPLATE'
and not exists (
  select 1 from cantarivo_rights.royalty_statements rs
  where rs.reporting_period_id = rp.id and rs.asset_id = a.id
);

comment on schema cantarivo_rights is
  'Owner-only Cantarivo rights, license, use, royalty, and audit records. Not exposed to anon/authenticated Data API roles.';
