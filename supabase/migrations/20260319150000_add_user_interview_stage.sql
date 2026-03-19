alter table public.lowongan_pekerjaan
  add column if not exists user_interview_mode text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lowongan_pekerjaan_user_interview_mode_check'
  ) then
    alter table public.lowongan_pekerjaan
      add constraint lowongan_pekerjaan_user_interview_mode_check
      check (user_interview_mode in ('none', 'optional', 'required'));
  end if;
end
$$;

alter table public.pelamar
  add column if not exists user_interview_status text,
  add column if not exists user_interview_datetime timestamptz,
  add column if not exists user_interview_location text,
  add column if not exists user_interview_interviewer text,
  add column if not exists user_interview_interviewer_role text,
  add column if not exists user_interview_notes text,
  add column if not exists user_interview_recommendation text;

alter table public.jadwal_wawancara
  add column if not exists interview_type text not null default 'hrd',
  add column if not exists interviewer_role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jadwal_wawancara_interview_type_check'
  ) then
    alter table public.jadwal_wawancara
      add constraint jadwal_wawancara_interview_type_check
      check (interview_type in ('hrd', 'user'));
  end if;
end
$$;

create index if not exists pelamar_user_interview_status_idx
  on public.pelamar (user_interview_status);

create index if not exists jadwal_wawancara_interview_type_idx
  on public.jadwal_wawancara (interview_type, interview_datetime desc);
