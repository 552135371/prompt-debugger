import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yxbpghtgggsrnnzfkanj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YnBnaHRnZ2dzcm5uemZrYW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzcxNDcsImV4cCI6MjA5MzcxMzE0N30.Lkjwj_qj5ZwHFaIt-i5QQ-I3mfMVh9NTuJxJkwGm3_8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
