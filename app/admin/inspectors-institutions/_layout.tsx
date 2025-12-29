import { Stack } from 'expo-router';

export default function InspectorsInstitutionsStack() {
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
          title: 'Inspectors & Institutions',
        }}
      />
      <Stack.Screen
        name="inspectors"
        options={{
          // Screen has its own custom header; avoid duplicate header text
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inspector-profile"
        options={{
          title: 'Inspector Profile',
        }}
      />
      <Stack.Screen
        name="inspectors/add"
        options={{
          title: 'Add Inspector',
        }}
      />
      <Stack.Screen
        name="inspectors/edit"
        options={{
          title: 'Edit Inspector',
        }}
      />
      <Stack.Screen
        name="institutions"
        options={{
          title: 'Institutions',
        }}
      />
      <Stack.Screen
        name="institution-profile"
        options={{
          title: 'Institution Profile',
        }}
      />
      <Stack.Screen
        name="institutions/add"
        options={{
          title: 'Add Institution',
        }}
      />
      <Stack.Screen
        name="institutions/edit"
        options={{
          title: 'Edit Institution',
        }}
      />
      <Stack.Screen
        name="districts"
        options={{
          title: 'Districts',
        }}
      />
    </Stack>
  );
}
