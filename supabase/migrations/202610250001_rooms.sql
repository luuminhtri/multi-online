-- Room schema v1. Engine snapshots carry their own schemaVersion/rulesVersion.
-- Private server storage: browser anon/authenticated roles cannot read or write.
create table if not exists public.ma_soi_rooms (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  revision bigint not null check (revision >= 0),
  create_key text not null unique check (create_key ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  document jsonb not null check (
    document->>'code' = code and (document->>'revision')::bigint = revision
    and (document->>'schemaVersion')::int = 1
  )
);
create index if not exists ma_soi_rooms_expiry on public.ma_soi_rooms (expires_at);
alter table public.ma_soi_rooms enable row level security;
revoke all on public.ma_soi_rooms from public, anon, authenticated;
grant select, insert, update, delete on public.ma_soi_rooms to service_role;

create or replace function public.ma_soi_commit_room(p_code text, p_expected_revision bigint, p_document jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_document->>'code' is distinct from p_code
     or (p_document->>'revision')::bigint is distinct from p_expected_revision + 1
     or (p_document->>'schemaVersion')::int is distinct from 1
     or pg_catalog.pg_column_size(p_document) > 2000000 then
    raise exception 'INVALID_ROOM_COMMIT';
  end if;
  if p_expected_revision = -1 then
    insert into public.ma_soi_rooms(code, revision, create_key, expires_at, document)
      values (p_code, 0, p_document->>'createKey', (p_document->>'expiresAt')::timestamptz, p_document)
      on conflict do nothing;
  else
    update public.ma_soi_rooms set revision = p_expected_revision + 1, document = p_document
      where code = p_code and revision = p_expected_revision and expires_at > pg_catalog.now()
        and create_key = p_document->>'createKey';
  end if;
  return found;
end;
$$;
revoke all on function public.ma_soi_commit_room(text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.ma_soi_commit_room(text, bigint, jsonb) to service_role;
