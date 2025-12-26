import { Stack } from 'expo-router';

export default function SearchStack() {
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
          title: 'Search Institutions',
        }}
      />
      <Stack.Screen
        name="collection"
        options={{
          title: 'Collection Entry',
        }}
      />
    </Stack>
  );
}
























