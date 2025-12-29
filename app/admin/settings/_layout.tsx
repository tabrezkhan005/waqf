import { Stack } from 'expo-router';

export default function SettingsStack() {
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
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="queries"
        options={{
          title: 'Queries',
        }}
      />
      <Stack.Screen
        name="query-details"
        options={{
          title: 'Query Details',
        }}
      />
      <Stack.Screen
        name="announcements"
        options={{
          title: 'Announcements',
        }}
      />
    </Stack>
  );
}
