import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { promises as fs } from 'fs';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting volunteer import...');

    // Try to read the XLSX file from multiple possible locations
    const possiblePaths = [
      '/data/volunteers.xlsx',
      './public/volunteers.xlsx',
      './volunteers.xlsx',
      'public/volunteers.xlsx'
    ];

    let fileBuffer: Buffer | null = null;
    let filePath = '';

    for (const path of possiblePaths) {
      try {
        console.log(`Trying to read file at: ${path}`);
        fileBuffer = await fs.readFile(path);
        filePath = path;
        console.log(`✅ Found file at: ${path}, size: ${fileBuffer.length}`);
        break;
      } catch (error) {
        console.log(`❌ File not found at: ${path}, error: ${error instanceof Error ? error.message : error}`);
        continue;
      }
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Volunteers Excel file not found', details: 'Please place volunteers.xlsx in /data/ or public/ directory' },
        { status: 404 }
      );
    }

    // Read the XLSX file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${jsonData.length} rows in the Excel file`);

    // Process each row
    const volunteersToUpsert = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;

      try {
        // Validate required fields
        if (!row.name || !row.email || !row.role) {
          errors.push(`Row ${i + 1}: Missing required fields (name, email, role)`);
          continue;
        }

        // Validate status
        const status = row.status?.toString().toLowerCase();
        if (status !== 'active' && status !== 'inactive') {
          errors.push(`Row ${i + 1}: Invalid status '${row.status}'. Must be 'Active' or 'Inactive'`);
          continue;
        }

        // Parse joining date
        let joiningDate: string | null = null;
        if (row.joining_date) {
          try {
            // Try to parse various date formats
            const date = new Date(row.joining_date);
            if (!isNaN(date.getTime())) {
              joiningDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            } else {
              errors.push(`Row ${i + 1}: Invalid joining_date format`);
              continue;
            }
          } catch (error) {
            errors.push(`Row ${i + 1}: Could not parse joining_date`);
            continue;
          }
        }

        // Prepare volunteer data for upsert
        const volunteerData = {
          full_name: row.name.toString().trim(),
          email: row.email.toString().trim().toLowerCase(),
          role: row.role.toString().trim(),
          status: status === 'active' ? 'Active' : 'Inactive',
          joining_date: joiningDate,
        };

        volunteersToUpsert.push(volunteerData);

      } catch (error) {
        errors.push(`Row ${i + 1}: Unexpected error - ${error}`);
      }
    }

    console.log(`Processing ${volunteersToUpsert.length} valid volunteers...`);

    // Upsert volunteers to Supabase
    if (volunteersToUpsert.length > 0) {
      const { data, error } = await supabase
        .from('volunteers')
        .upsert(volunteersToUpsert, {
          onConflict: 'email', // Use email as unique identifier
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Supabase upsert error:', error);
        return NextResponse.json(
          { error: 'Failed to upsert volunteers to database', details: error.message },
          { status: 500 }
        );
      }

      console.log(`Successfully upserted ${data?.length || 0} volunteers`);
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Import completed successfully`,
      stats: {
        totalRows: jsonData.length,
        processed: volunteersToUpsert.length,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      sampleData: volunteersToUpsert.slice(0, 3), // Show first 3 for verification
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import volunteers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Optional: GET method to check import status or get sample data
export async function GET() {
  try {
    const { data: volunteers, error } = await supabase
      .from('volunteers')
      .select('id, full_name, email, role, status, joining_date')
      .order('joining_date', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      totalVolunteers: volunteers?.length || 0,
      recentVolunteers: volunteers,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch volunteers' },
      { status: 500 }
    );
  }
}