'use client';
import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export default function Profile() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!session) return;

    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUserData(user);
    }

    fetchUser();
  }, [session, supabase]);

  if (!session) return <p>Please sign in first.</p>;
  if (!userData) return <p>Loading...</p>;

  return <div>Welcome {userData.email}</div>;
}
