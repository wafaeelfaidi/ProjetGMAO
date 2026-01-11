/**
 * Supabase CSV Storage Service
 * Handles CSV files stored in Supabase Storage
 */

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const STORAGE_BUCKET = 'documents';
const IOT_STREAMS_FOLDER = 'iot_streams';

export interface CSVFileInfo {
  name: string;
  path: string;
  size: number;
  created_at: string;
  updated_at: string;
  publicUrl: string;
}

/**
 * List all CSV files from Supabase Storage
 */
export async function listCSVFilesFromStorage(): Promise<CSVFileInfo[]> {
  const client = getSupabaseServerAdminClient();

  try {
    console.log(`📂 Listing files in ${STORAGE_BUCKET}/${IOT_STREAMS_FOLDER}...`);
    
    // List files in the iot_streams folder
    const { data: files, error } = await client.storage
      .from(STORAGE_BUCKET)
      .list(IOT_STREAMS_FOLDER, {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' },
      });

    if (error) {
      console.error('❌ Error listing CSV files from storage:', error);
      throw new Error(`Failed to list CSV files: ${error.message}`);
    }

    if (!files || files.length === 0) {
      console.log('⚠️  No files found in storage');
      return [];
    }

    console.log(`✅ Found ${files.length} files in storage`);

    // Filter CSV files (exclude placeholders and empty names) and get public URLs
    const csvFiles = files
      .filter((file) => 
        file.name && 
        file.name.trim() !== '' && 
        !file.name.startsWith('.') &&
        file.name.toLowerCase().endsWith('.csv')
      )
      .map((file) => {
        const filePath = `${IOT_STREAMS_FOLDER}/${file.name}`;
        const { data: urlData } = client.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        return {
          name: file.name,
          path: filePath,
          size: file.metadata?.size || 0,
          created_at: file.created_at || '',
          updated_at: file.updated_at || '',
          publicUrl: urlData.publicUrl,
        };
      });

    console.log(`✅ Filtered to ${csvFiles.length} CSV files`);
    return csvFiles;
  } catch (error) {
    console.error('❌ Error in listCSVFilesFromStorage:', error);
    throw error;
  }
}

/**
 * Download CSV file content from Supabase Storage
 */
export async function downloadCSVFromStorage(
  filePath: string,
): Promise<string> {
  const client = getSupabaseServerAdminClient();

  try {
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .download(filePath);

    if (error) {
      console.error('Error downloading CSV file:', error);
      throw new Error(`Failed to download CSV: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data received from storage');
    }

    // Convert blob to text
    const text = await data.text();
    return text;
  } catch (error) {
    console.error('Error in downloadCSVFromStorage:', error);
    throw error;
  }
}

/**
 * Get the latest CSV file from storage
 */
export async function getLatestCSVFile(): Promise<CSVFileInfo | null> {
  const files = await listCSVFilesFromStorage();

  if (files.length === 0) {
    return null;
  }

  // Files are already sorted by updated_at desc
  return files[0] || null;
}
