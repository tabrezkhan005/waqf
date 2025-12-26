import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeStack() {
  const { profile } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A7E43', // Islamic Green
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontFamily: 'Nunito-Bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="district-analytics"
        options={{
          title: 'District Analytics',
        }}
      />
    </Stack>
  );
}
