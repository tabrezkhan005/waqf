import { Stack } from 'expo-router';

export default function CollectionsStack() {
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
          title: 'My Collections',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Collection Details',
        }}
      />
    </Stack>
  );
}

































