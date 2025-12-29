import { Stack } from 'expo-router';

export default function ReportsStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Reports',
        }}
      />
      <Stack.Screen
        name="district"
        options={{
          title: 'District Report',
        }}
      />
      <Stack.Screen
        name="institution"
        options={{
          title: 'Institution History',
        }}
      />
      <Stack.Screen
        name="inspector"
        options={{
          title: 'Inspector History',
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
