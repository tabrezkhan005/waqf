import { Stack } from 'expo-router';

export default function CollectionsStack() {
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="details"
        options={{
          title: 'Collection Details',
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: 'Export Collections',
        }}
      />
    </Stack>
  );
}
