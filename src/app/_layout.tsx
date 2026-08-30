import { Slot } from 'expo-router';

import '@/lib/environment';
import '@/lib/supabase/client';

export default function RootLayout() {
  return <Slot />;
}
