alter table public.candidate_test_packages
  add column if not exists interview_access_secret text,
  add column if not exists interview_access_claimed_at timestamptz;

create index if not exists candidate_test_packages_interview_access_secret_idx
  on public.candidate_test_packages (interview_access_secret)
  where interview_access_secret is not null;

alter table public.candidate_test_packages enable row level security;
alter table public.candidate_test_package_items enable row level security;
alter table public.interview_ai_question_bank_configs enable row level security;

drop policy if exists "Anon can manage non Interview AI packages" on public.candidate_test_packages;
create policy "Anon can manage non Interview AI packages"
  on public.candidate_test_packages
  for all
  to anon
  using (template_key <> 'interview_ai_screening')
  with check (template_key <> 'interview_ai_screening');

drop policy if exists "Anon can manage non Interview AI package items" on public.candidate_test_package_items;
create policy "Anon can manage non Interview AI package items"
  on public.candidate_test_package_items
  for all
  to anon
  using (
    exists (
      select 1
      from public.candidate_test_packages package_row
      where package_row.id = candidate_test_package_items.package_id
        and package_row.template_key <> 'interview_ai_screening'
    )
  )
  with check (
    exists (
      select 1
      from public.candidate_test_packages package_row
      where package_row.id = candidate_test_package_items.package_id
        and package_row.template_key <> 'interview_ai_screening'
    )
  );

drop policy if exists "Anon can upload interview ai answer audio" on storage.objects;
create policy "Anon can upload interview ai answer audio"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'interview-ai-answer-audio'
    and name ~ '^package-[0-9]+/item-[0-9]+/[A-Za-z0-9._-]+$'
  );

drop policy if exists "Anon can update interview ai answer audio" on storage.objects;
drop policy if exists "Anon can read interview ai answer audio metadata" on storage.objects;

create or replace function public.generate_interview_ai_access_secret(p_seed text default '')
returns text
language sql
as $$
  select md5(
    coalesce(p_seed, '')
    || random()::text
    || clock_timestamp()::text
    || coalesce(inet_client_addr()::text, '')
  );
$$;

create or replace function public.build_interview_ai_package_admin_json(p_package_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    (to_jsonb(package_row) - 'interview_access_secret' - 'interview_access_claimed_at')
    || jsonb_build_object(
      'pelamar',
      case
        when pelamar_row.id is null then null
        else to_jsonb(pelamar_row)
      end,
      'candidate_test_package_items',
      coalesce(
        (
          select jsonb_agg(to_jsonb(item_row) order by item_row.test_order)
          from public.candidate_test_package_items item_row
          where item_row.package_id = package_row.id
        ),
        '[]'::jsonb
      )
    )
  from public.candidate_test_packages package_row
  left join public.pelamar pelamar_row
    on pelamar_row.id = package_row.pelamar_id
  where package_row.id = p_package_id
    and package_row.template_key = 'interview_ai_screening';
$$;

create or replace function public.build_interview_ai_package_public_json(p_package_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', package_row.id,
    'pelamar_id', package_row.pelamar_id,
    'template_key', package_row.template_key,
    'template_name', package_row.template_name,
    'status', package_row.status,
    'opened_at', package_row.opened_at,
    'completed_at', package_row.completed_at,
    'reviewed_at', package_row.reviewed_at,
    'deadline_at', package_row.deadline_at,
    'created_at', package_row.created_at,
    'updated_at', package_row.updated_at,
    'pelamar',
    case
      when pelamar_row.id is null then null
      else jsonb_build_object(
        'id', pelamar_row.id,
        'nama_lengkap', pelamar_row.nama_lengkap,
        'posisi_dilamar', pelamar_row.posisi_dilamar,
        'status_tindak_lanjut', pelamar_row.status_tindak_lanjut
      )
    end,
    'candidate_test_package_items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item_row.id,
            'package_id', item_row.package_id,
            'test_key', item_row.test_key,
            'test_name_snapshot', item_row.test_name_snapshot,
            'test_order', item_row.test_order,
            'status', item_row.status,
            'started_at', item_row.started_at,
            'completed_at', item_row.completed_at,
            'summary', item_row.summary,
            'result_json', item_row.result_json,
            'created_at', item_row.created_at,
            'updated_at', item_row.updated_at
          )
          order by item_row.test_order
        )
        from public.candidate_test_package_items item_row
        where item_row.package_id = package_row.id
      ),
      '[]'::jsonb
    )
  )
  from public.candidate_test_packages package_row
  left join public.pelamar pelamar_row
    on pelamar_row.id = package_row.pelamar_id
  where package_row.id = p_package_id
    and package_row.template_key = 'interview_ai_screening';
$$;

create or replace function public.get_public_interview_ai_session(
  p_link_token text,
  p_access_secret text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_access_secret text;
begin
  if nullif(trim(coalesce(p_access_secret, '')), '') is not null then
    select package_row.id, package_row.interview_access_secret
      into v_package_id, v_access_secret
    from public.candidate_test_packages package_row
    where package_row.link_token = p_link_token
      and package_row.template_key = 'interview_ai_screening'
      and package_row.interview_access_secret = p_access_secret
    order by package_row.created_at desc
    limit 1;

    if v_package_id is null then
      raise exception 'INTERVIEW_AI_ACCESS_DENIED';
    end if;

    update public.candidate_test_packages
      set
        status = case when status = 'sent' then 'opened' else status end,
        opened_at = coalesce(opened_at, timezone('utc', now()))
      where id = v_package_id;
  else
    select package_row.id
      into v_package_id
    from public.candidate_test_packages package_row
    where package_row.link_token = p_link_token
      and package_row.template_key = 'interview_ai_screening'
      and package_row.interview_access_secret is null
    order by package_row.created_at desc
    limit 1;

    if v_package_id is null then
      if exists (
        select 1
        from public.candidate_test_packages package_row
        where package_row.link_token = p_link_token
          and package_row.template_key = 'interview_ai_screening'
      ) then
        raise exception 'INTERVIEW_AI_ACCESS_DENIED';
      end if;

      return null;
    end if;

    v_access_secret := public.generate_interview_ai_access_secret(p_link_token);

    update public.candidate_test_packages
      set
        interview_access_secret = v_access_secret,
        interview_access_claimed_at = coalesce(interview_access_claimed_at, timezone('utc', now())),
        status = case when status = 'sent' then 'opened' else status end,
        opened_at = coalesce(opened_at, timezone('utc', now()))
      where id = v_package_id
        and interview_access_secret is null;

    if not found then
      raise exception 'INTERVIEW_AI_ACCESS_DENIED';
    end if;
  end if;

  update public.pelamar
    set
      tahap_proses = 'Wawancara AI',
      status_tindak_lanjut = 'Sedang dikerjakan'
    where id = (
      select package_row.pelamar_id
      from public.candidate_test_packages package_row
      where package_row.id = v_package_id
    );

  return jsonb_build_object(
    'access_secret', v_access_secret,
    'session', public.build_interview_ai_package_public_json(v_package_id)
  );
end;
$$;

create or replace function public.save_public_interview_ai_audio_answer(
  p_link_token text,
  p_access_secret text,
  p_item_id bigint,
  p_audio_bucket text,
  p_audio_path text,
  p_audio_url text,
  p_audio_duration_seconds integer,
  p_audio_mime_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_started_at timestamptz;
  v_completed_at timestamptz := timezone('utc', now());
begin
  select package_row.id
    into v_package_id
  from public.candidate_test_packages package_row
  where package_row.link_token = p_link_token
    and package_row.template_key = 'interview_ai_screening'
    and package_row.interview_access_secret = p_access_secret
  order by package_row.created_at desc
  limit 1;

  if v_package_id is null then
    raise exception 'INTERVIEW_AI_ACCESS_DENIED';
  end if;

  if not exists (
    select 1
    from public.candidate_test_package_items item_row
    where item_row.id = p_item_id
      and item_row.package_id = v_package_id
  ) then
    raise exception 'INTERVIEW_AI_ITEM_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.candidate_test_package_items item_row
    where item_row.id = p_item_id
      and nullif(trim(coalesce(item_row.result_json ->> 'answer_audio_url', '')), '') is not null
  ) then
    raise exception 'INTERVIEW_AI_ONE_TAKE_LOCKED';
  end if;

  if p_audio_bucket <> 'interview-ai-answer-audio' then
    raise exception 'INTERVIEW_AI_INVALID_AUDIO_BUCKET';
  end if;

  if p_audio_path !~ format('^package-%s/item-%s/[A-Za-z0-9._-]+$', v_package_id, p_item_id) then
    raise exception 'INTERVIEW_AI_INVALID_AUDIO_PATH';
  end if;

  select coalesce(item_row.started_at, v_completed_at)
    into v_started_at
  from public.candidate_test_package_items item_row
  where item_row.id = p_item_id;

  update public.candidate_test_package_items
    set
      status = 'completed',
      started_at = v_started_at,
      completed_at = v_completed_at,
      summary = case
        when coalesce(p_audio_duration_seconds, 0) > 0 then format('Jawaban audio kandidat (%s detik)', p_audio_duration_seconds)
        else 'Jawaban audio kandidat'
      end,
      result_json = coalesce(result_json, '{}'::jsonb) || jsonb_build_object(
        'answer_mode', 'audio',
        'answer_audio_bucket', p_audio_bucket,
        'answer_audio_path', p_audio_path,
        'answer_audio_url', p_audio_url,
        'answer_audio_duration_seconds', coalesce(p_audio_duration_seconds, 0),
        'answer_audio_mime_type', p_audio_mime_type,
        'answered_at', v_completed_at
      )
    where id = p_item_id;

  update public.candidate_test_packages
    set status = case when status in ('sent', 'opened') then 'in_progress' else status end
    where id = v_package_id;

  update public.pelamar
    set
      tahap_proses = 'Wawancara AI',
      status_tindak_lanjut = 'Sedang dikerjakan'
    where id = (
      select package_row.pelamar_id
      from public.candidate_test_packages package_row
      where package_row.id = v_package_id
    );

  return public.build_interview_ai_package_public_json(v_package_id);
end;
$$;

create or replace function public.finish_public_interview_ai_session(
  p_link_token text,
  p_access_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_total_items integer;
  v_answered_items integer;
  v_now timestamptz := timezone('utc', now());
begin
  select package_row.id
    into v_package_id
  from public.candidate_test_packages package_row
  where package_row.link_token = p_link_token
    and package_row.template_key = 'interview_ai_screening'
    and package_row.interview_access_secret = p_access_secret
  order by package_row.created_at desc
  limit 1;

  if v_package_id is null then
    raise exception 'INTERVIEW_AI_ACCESS_DENIED';
  end if;

  select count(*)
    into v_total_items
  from public.candidate_test_package_items item_row
  where item_row.package_id = v_package_id;

  select count(*)
    into v_answered_items
  from public.candidate_test_package_items item_row
  where item_row.package_id = v_package_id
    and nullif(trim(coalesce(item_row.result_json ->> 'answer_audio_url', '')), '') is not null;

  if v_total_items = 0 or v_answered_items <> v_total_items then
    raise exception 'INTERVIEW_AI_NOT_COMPLETE';
  end if;

  update public.candidate_test_packages
    set
      status = 'completed',
      completed_at = v_now,
      overall_summary = format('Kandidat menyelesaikan %s pertanyaan Wawancara AI dan menunggu review recruiter.', v_total_items)
    where id = v_package_id;

  update public.pelamar
    set
      tahap_proses = 'Wawancara AI',
      status_tindak_lanjut = 'Sudah selesai'
    where id = (
      select package_row.pelamar_id
      from public.candidate_test_packages package_row
      where package_row.id = v_package_id
    );

  return public.build_interview_ai_package_public_json(v_package_id);
end;
$$;

create or replace function public.get_interview_ai_question_bank()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select config_row.question_bank
      from public.interview_ai_question_bank_configs config_row
      where config_row.config_key = 'default'
      limit 1
    ),
    '[]'::jsonb
  );
$$;

create or replace function public.save_interview_ai_question_bank(
  p_question_bank jsonb,
  p_updated_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.interview_ai_question_bank_configs (config_key, question_bank, updated_by)
  values ('default', coalesce(p_question_bank, '[]'::jsonb), p_updated_by)
  on conflict (config_key) do update
    set
      question_bank = excluded.question_bank,
      updated_by = excluded.updated_by;

  return public.get_interview_ai_question_bank();
end;
$$;

create or replace function public.get_interview_ai_packages_by_pelamar_ids(p_pelamar_ids bigint[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ranked_packages as (
    select
      package_row.id,
      package_row.created_at,
      row_number() over (
        partition by package_row.pelamar_id
        order by package_row.created_at desc
      ) as row_order
    from public.candidate_test_packages package_row
    where package_row.template_key = 'interview_ai_screening'
      and package_row.pelamar_id = any(coalesce(p_pelamar_ids, '{}'::bigint[]))
  )
  select coalesce(
    jsonb_agg(public.build_interview_ai_package_admin_json(ranked_packages.id) order by ranked_packages.created_at desc),
    '[]'::jsonb
  )
  from ranked_packages
  where ranked_packages.row_order = 1;
$$;

create or replace function public.create_interview_ai_package(
  p_pelamar_id bigint,
  p_deadline_at timestamptz,
  p_created_by text default null,
  p_catatan_recruiter text default null,
  p_link_token text default null,
  p_link_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_items_inserted integer := 0;
begin
  insert into public.candidate_test_packages (
    pelamar_id,
    template_key,
    template_name,
    status,
    link_token,
    link_url,
    sent_at,
    deadline_at,
    created_by,
    catatan_recruiter,
    overall_summary,
    overall_recommendation,
    is_active
  )
  values (
    p_pelamar_id,
    'interview_ai_screening',
    'Wawancara AI',
    'sent',
    p_link_token,
    p_link_url,
    timezone('utc', now()),
    p_deadline_at,
    p_created_by,
    p_catatan_recruiter,
    null,
    null,
    false
  )
  returning id into v_package_id;

  insert into public.candidate_test_package_items (
    package_id,
    test_key,
    test_name_snapshot,
    test_order,
    status,
    result_json
  )
  select
    v_package_id,
    coalesce(nullif(trim(question_item.value ->> 'key'), ''), format('q%s', question_item.ordinality)),
    coalesce(nullif(trim(question_item.value ->> 'title'), ''), format('Pertanyaan %s', question_item.ordinality)),
    question_item.ordinality::integer,
    'pending',
    jsonb_build_object(
      'question_key', coalesce(nullif(trim(question_item.value ->> 'key'), ''), format('q%s', question_item.ordinality)),
      'question_text', coalesce(question_item.value ->> 'questionText', ''),
      'hint', coalesce(question_item.value ->> 'hint', ''),
      'prompt_audio_url', coalesce(question_item.value ->> 'promptAudioUrl', ''),
      'audio_source_text', coalesce(question_item.value ->> 'audioSourceText', question_item.value ->> 'questionText', '')
    )
  from jsonb_array_elements(public.get_interview_ai_question_bank()) with ordinality as question_item(value, ordinality)
  where coalesce((question_item.value ->> 'isActive')::boolean, true) = true
    and nullif(trim(coalesce(question_item.value ->> 'questionText', '')), '') is not null;

  get diagnostics v_items_inserted = row_count;

  if v_items_inserted = 0 then
    delete from public.candidate_test_packages where id = v_package_id;
    raise exception 'INTERVIEW_AI_QUESTION_BANK_EMPTY';
  end if;

  return public.build_interview_ai_package_admin_json(v_package_id);
end;
$$;

create or replace function public.update_interview_ai_package_review(
  p_package_id bigint,
  p_overall_summary text default null,
  p_overall_recommendation text default null,
  p_catatan_recruiter text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.candidate_test_packages
    set
      overall_summary = p_overall_summary,
      overall_recommendation = p_overall_recommendation,
      catatan_recruiter = p_catatan_recruiter,
      status = coalesce(p_status, status),
      reviewed_at = case when p_status = 'reviewed' then timezone('utc', now()) else reviewed_at end
    where id = p_package_id
      and template_key = 'interview_ai_screening';

  if not found then
    raise exception 'INTERVIEW_AI_PACKAGE_NOT_FOUND';
  end if;

  return public.build_interview_ai_package_admin_json(p_package_id);
end;
$$;

grant execute on function public.get_public_interview_ai_session(text, text) to anon;
grant execute on function public.save_public_interview_ai_audio_answer(text, text, bigint, text, text, text, integer, text) to anon;
grant execute on function public.finish_public_interview_ai_session(text, text) to anon;
grant execute on function public.get_interview_ai_question_bank() to anon;
grant execute on function public.save_interview_ai_question_bank(jsonb, text) to anon;
grant execute on function public.get_interview_ai_packages_by_pelamar_ids(bigint[]) to anon;
grant execute on function public.create_interview_ai_package(bigint, timestamptz, text, text, text, text) to anon;
grant execute on function public.update_interview_ai_package_review(bigint, text, text, text, text) to anon;
