import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AdminIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home dashboard
    router.replace('/admin/home');
  }, [router]);

  return null;
}









