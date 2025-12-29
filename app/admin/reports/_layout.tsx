import { Stack } from 'expo-router';

export default function ReportsStack() {
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
          title: 'Reports',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="district-performance"
        options={{
          title: 'District Performance',
        }}
      />
      <Stack.Screen
        name="inspector-performance"
        options={{
          title: 'Inspector Performance',
        }}
      />
      <Stack.Screen
        name="institution-performance"
        options={{
          title: 'Institution Performance',
        }}
      />
      <Stack.Screen
        name="monthly-trends"
        options={{
          title: 'Monthly Trends',
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: 'Export Reports',
        }}
      />
    </Stack>
  );
}
