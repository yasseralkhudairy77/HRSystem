import { supabase } from "@/lib/supabase";
import { buildEmployeePayloadFromPelamar, buildManualEmployeePayload, mapEmployeeRecordToProfile } from "@/lib/employeeRecordMapper";
import type { EmployeeProfile } from "@/types/employeeProfile";
import type { CreateEmployeePayload, EmployeeRecord, ManualEmployeeFormInput, OnboardingEmployeeForm, UpdateEmployeePayload } from "@/types/employee";
import type { Pelamar } from "@/types/pelamar";

const TABLE_NAME = "employees";

export async function getEmployeeList(): Promise<EmployeeRecord[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load list employees:", error);
    throw error;
  }

  return (data ?? []) as EmployeeRecord[];
}

export async function getEmployeeProfileList(): Promise<EmployeeProfile[]> {
  const rows = await getEmployeeList();
  return rows.map(mapEmployeeRecordToProfile);
}

export async function getEmployeeBySourcePelamarId(sourcePelamarId: number): Promise<EmployeeRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("source_pelamar_id", sourcePelamarId).maybeSingle();

  if (error) {
    console.error(`Supabase gagal load employee dari pelamar id=${sourcePelamarId}:`, error);
    throw error;
  }

  return (data as EmployeeRecord | null) ?? null;
}

export async function createEmployee(data: CreateEmployeePayload): Promise<EmployeeRecord | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).insert(data).select("*").single();

  if (error) {
    console.error("Supabase gagal create employee:", error);
    throw error;
  }

  return result as EmployeeRecord;
}

export async function updateEmployee(id: number, data: UpdateEmployeePayload): Promise<EmployeeRecord | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).update(data).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update employee id=${id}:`, error);
    throw error;
  }

  return result as EmployeeRecord;
}

export async function syncEmployeeFromPelamar(pelamar: Pelamar, onboardingForm: OnboardingEmployeeForm): Promise<EmployeeRecord | null> {
  const existing = await getEmployeeBySourcePelamarId(pelamar.id);
  const payload = buildEmployeePayloadFromPelamar({ pelamar, onboardingForm, existing });

  if (existing) {
    return updateEmployee(existing.id, payload);
  }

  return createEmployee(payload);
}

export async function createManualEmployee(input: ManualEmployeeFormInput): Promise<EmployeeRecord | null> {
  const payload: CreateEmployeePayload = buildManualEmployeePayload(input);
  return createEmployee(payload);
}
