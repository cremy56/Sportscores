import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pblywyrfsrrpnwbjdxoh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibHl3eXJmc3JycG53YmpkeG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNjUwMzQsImV4cCI6MjA2Njk0MTAzNH0.VLXPDpCybUhK9fRVEFm0vDM4S4_-of07TYHekFQVXi0'

export const supabase = createClient(supabaseUrl, supabaseKey)