-- New rooms use six decimal digits; keep existing alphanumeric codes valid.
begin;
alter table public.ma_soi_rooms drop constraint if exists ma_soi_rooms_code_check;
alter table public.ma_soi_rooms add constraint ma_soi_rooms_code_check
  check (code ~ '^([0-9]{6}|[A-Z2-9]{6})$');
commit;
