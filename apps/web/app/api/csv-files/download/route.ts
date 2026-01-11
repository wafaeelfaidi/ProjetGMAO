/**
 * API Route: Download CSV File Content from Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';

import { downloadCSVFromStorage } from '~/lib/DataManagement/csv-storage.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          error: 'File path is required',
        },
        { status: 400 },
      );
    }

    const content = await downloadCSVFromStorage(filePath);

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error('Error downloading CSV file:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
