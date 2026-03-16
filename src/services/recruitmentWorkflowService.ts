import { supabase } from "@/lib/supabase";

const STAGE_HISTORY_TABLE = "riwayat_tahap_pelamar";
const INTERVIEW_SCHEDULE_TABLE = "jadwal_wawancara";

export interface CreateStageHistoryPayload {
  pelamar_id: number;
  dari_tahap: string | null;
  ke_tahap: string;
  catatan?: string | null;
}

export interface CreateInterviewSchedulePayload {
  pelamar_id: number;
  interview_datetime: string;
  interviewer: string;
  location: string;
  notes?: string | null;
}

export async function createStageHistory(data: CreateStageHistoryPayload) {
  const { error } = await supabase.from(STAGE_HISTORY_TABLE).insert(data);

  if (error) {
    console.error("Supabase gagal simpan riwayat tahap:", error);
    throw error;
  }
}

export async function createInterviewSchedule(data: CreateInterviewSchedulePayload) {
  const { error } = await supabase.from(INTERVIEW_SCHEDULE_TABLE).insert({
    pelamar_id: data.pelamar_id,
    interview_datetime: data.interview_datetime,
    interviewer: data.interviewer,
    location: data.location,
    notes: data.notes ?? null,
  });

  if (error) {
    console.error("Supabase gagal simpan jadwal wawancara:", error);
    throw error;
  }
}
