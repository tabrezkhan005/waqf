import { Stack } from 'expo-router';

export default function ExploreStack() {
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
          title: 'Explore',
        }}
      />
      <Stack.Screen
        name="district"
        options={{
          title: 'District Details',
        }}
      />
      <Stack.Screen
        name="institution"
        options={{
          title: 'Institution Details',
        }}
      />
      <Stack.Screen
        name="inspector"
        options={{
          title: 'Inspector Details',
        }}
      />
    </Stack>
  );
}







































