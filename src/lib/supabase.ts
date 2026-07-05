import { createClient } from '@supabase/supabase-js'

// Grabs your secret credentials from the .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Initializes and exports the database client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)