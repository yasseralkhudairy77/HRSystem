create table if not exists public.interview_ai_question_bank_configs (
  config_key text primary key,
  question_bank jsonb not null default '[]'::jsonb,
  updated_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_interview_ai_question_bank_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_interview_ai_question_bank_configs_updated_at on public.interview_ai_question_bank_configs;

create trigger trg_interview_ai_question_bank_configs_updated_at
before update on public.interview_ai_question_bank_configs
for each row
execute function public.set_interview_ai_question_bank_configs_updated_at();

insert into public.interview_ai_question_bank_configs (config_key, question_bank, updated_by)
values (
  'default',
  '[
    {
      "key": "q1",
      "title": "Perkenalan singkat",
      "questionText": "Perkenalkan diri Anda secara singkat, termasuk pengalaman kerja atau kegiatan utama Anda saat ini.",
      "hint": "Sampaikan nama, domisili, dan ringkasan pengalaman yang paling relevan.",
      "promptAudioUrl": "/interview-ai/audio/questions/q1.mp3",
      "audioSourceText": "Perkenalkan diri Anda secara singkat, termasuk pengalaman kerja atau kegiatan utama Anda saat ini.",
      "isActive": true
    },
    {
      "key": "q2",
      "title": "Pengalaman terakhir",
      "questionText": "Ceritakan pengalaman kerja Anda di perusahaan atau tempat kerja terakhir.",
      "hint": "Fokus pada jenis perusahaan, durasi kerja, dan ruang lingkup pekerjaan Anda.",
      "promptAudioUrl": "/interview-ai/audio/questions/q2.mp3",
      "audioSourceText": "Ceritakan pengalaman kerja Anda di perusahaan atau tempat kerja terakhir.",
      "isActive": true
    },
    {
      "key": "q3",
      "title": "Tanggung jawab utama",
      "questionText": "Apa posisi dan tanggung jawab utama Anda di sana?",
      "hint": "Jelaskan tanggung jawab harian yang paling penting dan hasil kerja yang Anda pegang.",
      "promptAudioUrl": "/interview-ai/audio/questions/q3.mp3",
      "audioSourceText": "Apa posisi dan tanggung jawab utama Anda di sana?",
      "isActive": true
    },
    {
      "key": "q4",
      "title": "Alasan perpindahan",
      "questionText": "Apa alasan Anda keluar atau ingin keluar dari pekerjaan tersebut?",
      "hint": "Jawab jujur, singkat, dan tetap profesional.",
      "promptAudioUrl": "/interview-ai/audio/questions/q4.mp3",
      "audioSourceText": "Apa alasan Anda keluar atau ingin keluar dari pekerjaan tersebut?",
      "isActive": true
    },
    {
      "key": "q5",
      "title": "Status bekerja",
      "questionText": "Apakah saat ini Anda masih bekerja? Jika ya, jelaskan status kerja Anda saat ini.",
      "hint": "Sebutkan juga jika ada masa notice atau komitmen pekerjaan yang sedang berjalan.",
      "promptAudioUrl": "/interview-ai/audio/questions/q5.mp3",
      "audioSourceText": "Apakah saat ini Anda masih bekerja? Jika ya, jelaskan status kerja Anda saat ini.",
      "isActive": true
    },
    {
      "key": "q6",
      "title": "Kesiapan mulai kerja",
      "questionText": "Jika diterima, kapan Anda bisa mulai bekerja?",
      "hint": "Berikan estimasi waktu yang realistis.",
      "promptAudioUrl": "/interview-ai/audio/questions/q6.mp3",
      "audioSourceText": "Jika diterima, kapan Anda bisa mulai bekerja?",
      "isActive": true
    },
    {
      "key": "q7",
      "title": "Pencapaian kerja",
      "questionText": "Apa pencapaian kerja yang paling Anda banggakan sejauh ini?",
      "hint": "Pilih satu contoh yang paling kuat dan jelaskan dampaknya.",
      "promptAudioUrl": "/interview-ai/audio/questions/q7.mp3",
      "audioSourceText": "Apa pencapaian kerja yang paling Anda banggakan sejauh ini?",
      "isActive": true
    },
    {
      "key": "q8",
      "title": "Motivasi melamar",
      "questionText": "Kenapa Anda tertarik melamar posisi ini?",
      "hint": "Hubungkan minat Anda dengan posisi yang dilamar dan nilai yang bisa Anda bawa.",
      "promptAudioUrl": "/interview-ai/audio/questions/q8.mp3",
      "audioSourceText": "Kenapa Anda tertarik melamar posisi ini?",
      "isActive": true
    }
  ]'::jsonb,
  'system'
)
on conflict (config_key) do nothing;
