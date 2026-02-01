import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function fetchVolunteers() {
  const { data, error } = await supabase.from('volunteers').select('*')
  if (error) {
    console.error('Error fetching volunteers:', error)
  } else {
    console.log('Volunteers:', JSON.stringify(data, null, 2))
  }
}

fetchVolunteers()
