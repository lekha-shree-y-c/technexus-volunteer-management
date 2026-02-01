const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteImportedVolunteers() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('public/volunteers.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Get the full names from the Excel data
    const names = data.map(row => row.full_name).filter(name => name);

    if (names.length === 0) {
      console.log('No names found in Excel file.');
      return;
    }

    console.log('Deleting volunteers with names:', names);

    // Delete volunteers whose full_name matches the Excel data
    const { data: deleted, error } = await supabase
      .from('volunteers')
      .delete()
      .in('full_name', names);

    if (error) {
      console.error('Error deleting volunteers:', error);
    } else {
      console.log('Deleted volunteers:', deleted);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteImportedVolunteers();