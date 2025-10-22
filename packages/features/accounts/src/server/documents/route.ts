import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies });

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });

  const filePath = `documents/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (storageError) return new Response(JSON.stringify({ error: storageError.message }), { status: 500 });

  // Save metadata to table
  const { error: dbError } = await supabase.from('documents').insert({
    user_id: session.user.id,
    file_name: file.name,
    file_path: filePath
  });

  if (dbError) return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });

  return new Response(JSON.stringify({ message: 'File uploaded successfully', file_path: filePath }), { status: 201 });
}
