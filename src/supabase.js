import { createClient } from '@supabase/supabase-js'

// These should be in a .env file locally
// VITE_SUPABASE_URL=your_project_url
// VITE_SUPABASE_ANON_KEY=your_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'INSERT_SUPABASE_URL_HERE';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'INSERT_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseKey);
