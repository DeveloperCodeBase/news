import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export function getSupabaseServerClient() {
  return createServerComponentClient<Database>({ cookies });
}
