create table if not exists public.hr_letters_documents (
  id bigserial primary key,
  template_key text not null,
  category text not null,
  type_label text not null,
  document_number text not null,
  title text not null,
  created_date date not null,
  effective_date date not null,
  summary text not null default '',
  document_status text not null default 'Belum dibuat',
  file_pdf text not null default '',
  responsible_person text not null default '',
  admin_note text not null default '',
  business_name text not null default '',
  branch_name text not null default '',
  employee_code text not null default '',
  employee_name text not null default '',
  job_title text not null default '',
  attach_to_employee boolean not null default false,
  target_audience text not null default '',
  document_body text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists hr_letters_documents_document_number_idx
  on public.hr_letters_documents (document_number);

create index if not exists hr_letters_documents_status_idx
  on public.hr_letters_documents (document_status, updated_at desc);

create index if not exists hr_letters_documents_employee_code_idx
  on public.hr_letters_documents (employee_code, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hr_letters_documents_category_check'
  ) then
    alter table public.hr_letters_documents
      add constraint hr_letters_documents_category_check
      check (category in ('surat', 'pengumuman'));
  end if;
end $$;

create or replace function public.set_hr_letters_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_hr_letters_documents_updated_at on public.hr_letters_documents;

create trigger trg_hr_letters_documents_updated_at
before update on public.hr_letters_documents
for each row
execute function public.set_hr_letters_documents_updated_at();
