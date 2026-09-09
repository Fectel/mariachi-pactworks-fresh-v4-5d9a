
-- PactWorks v4.6A Hosted Contract Portal
-- Scope: pactworks schema only. No public/Martha's Studio tables are touched.

create table if not exists pactworks.hosted_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  contract_external_id text not null,
  contract_version integer not null default 1,
  token_hash text not null unique,
  client_name text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  contract_payload jsonb not null,
  status text not null default 'sent'
    check (status in ('sent','viewed','signed','payment_declared','confirmed','revoked','expired')),
  acceptance jsonb,
  signed_at timestamptz,
  payment_choice text,
  payment_amount numeric(12,2),
  payment_method text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','client_declared_sent','verified','rejected')),
  payment_declared_at timestamptz,
  payment_verified_at timestamptz,
  payment_verified_by uuid,
  payment_reference text,
  reservation_status text not null default 'open'
    check (reservation_status in ('open','reserved','released')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, contract_external_id, contract_version)
);

create index if not exists hosted_contracts_org_external_idx
  on pactworks.hosted_contracts(org_id, contract_external_id);
create index if not exists hosted_contracts_status_idx
  on pactworks.hosted_contracts(org_id, status, updated_at desc);

create table if not exists pactworks.hosted_contract_events (
  id uuid primary key default gen_random_uuid(),
  hosted_contract_id uuid not null references pactworks.hosted_contracts(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('admin','client','system')),
  actor_user_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists hosted_contract_events_contract_idx
  on pactworks.hosted_contract_events(hosted_contract_id, created_at);

alter table pactworks.hosted_contracts enable row level security;
alter table pactworks.hosted_contract_events enable row level security;

-- No direct anon/authenticated table policies by design.
-- The Railway PactWorks API uses the Supabase service role after independently
-- validating the admin's Supabase Auth bearer token or the hashed client token.
revoke all on pactworks.hosted_contracts from anon, authenticated;
revoke all on pactworks.hosted_contract_events from anon, authenticated;

create or replace function pactworks.set_hosted_contract_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hosted_contracts_updated_at on pactworks.hosted_contracts;
create trigger hosted_contracts_updated_at
before update on pactworks.hosted_contracts
for each row execute function pactworks.set_hosted_contract_updated_at();
