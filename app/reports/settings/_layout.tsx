import { Stack } from 'expo-router';

export default function SettingsStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#2A2A2A',
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
        name="export"
        options={{
          title: 'Export Center',
        }}
      />
    </Stack>
  );
}

































