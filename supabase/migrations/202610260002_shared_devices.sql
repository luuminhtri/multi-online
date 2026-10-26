-- Room v3: shared-device membership; existing v1/v2 documents migrate on write.
-- Existing v1 documents stay readable; the application migrates on first write.
begin;
do $$
declare existing record;
begin
  for existing in
    select conname from pg_catalog.pg_constraint
    where conrelid = 'public.ma_soi_rooms'::pg_catalog.regclass
      and contype = 'c'
      and pg_catalog.pg_get_constraintdef(oid) like '%schemaVersion%'
  loop
    execute pg_catalog.format('alter table public.ma_soi_rooms drop constraint %I', existing.conname);
  end loop;
end;
$$;
alter table public.ma_soi_rooms add constraint ma_soi_rooms_document_v3_check check (
  document->>'code' = code and (document->>'revision')::bigint = revision
  and (document->>'schemaVersion')::int in (1, 2, 3)
);
create or replace function public.ma_soi_commit_room(p_code text, p_expected_revision bigint, p_document jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_document->>'code' is distinct from p_code
     or (p_document->>'revision')::bigint is distinct from p_expected_revision + 1
     or coalesce((p_document->>'schemaVersion')::int, 0) not in (1, 2, 3)
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

commit;
