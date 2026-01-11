/**
 * API Route: List CSV Files from Supabase Storage
 */

import { NextResponse } from 'next/server';

import { listCSVFilesFromStorage } from '~/lib/DataManagement/csv-storage.service';

export async function GET() {
  try {
    console.log('📂 Fetching CSV files from Supabase Storage...');
    const files = await listCSVFilesFromStorage();
    console.log(`✅ Found ${files.length} CSV files`);

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    });
  } catch (error) {
    console.error('❌ Error listing CSV files:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
        count: 0,
      },
      { status: 500 },
    );
  }
}
