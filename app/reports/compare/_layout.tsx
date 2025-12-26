import { Stack } from 'expo-router';

export default function CompareStack() {
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
          title: 'Compare',
        }}
      />
      <Stack.Screen
        name="districts"
        options={{
          title: 'District Comparison',
        }}
      />
      <Stack.Screen
        name="inspectors"
        options={{
          title: 'Inspector Performance',
        }}
      />
      <Stack.Screen
        name="institutions"
        options={{
          title: 'Institution Ranking',
        }}
      />
    </Stack>
  );
}

























