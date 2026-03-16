import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabase environment variables belum lengkap. Cek VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di file .env.");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
