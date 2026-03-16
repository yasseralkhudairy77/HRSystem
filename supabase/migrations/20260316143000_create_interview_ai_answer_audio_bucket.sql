insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-ai-answer-audio',
  'interview-ai-answer-audio',
  true,
  20971520,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anon can upload interview ai answer audio'
  ) then
    create policy "Anon can upload interview ai answer audio"
      on storage.objects
      for insert
      to anon
      with check (bucket_id = 'interview-ai-answer-audio');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anon can update interview ai answer audio'
  ) then
    create policy "Anon can update interview ai answer audio"
      on storage.objects
      for update
      to anon
      using (bucket_id = 'interview-ai-answer-audio')
      with check (bucket_id = 'interview-ai-answer-audio');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anon can read interview ai answer audio metadata'
  ) then
    create policy "Anon can read interview ai answer audio metadata"
      on storage.objects
      for select
      to anon
      using (bucket_id = 'interview-ai-answer-audio');
  end if;
end $$;
