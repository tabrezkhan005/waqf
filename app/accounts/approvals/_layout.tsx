import { Stack } from 'expo-router';

export default function ApprovalsStack() {
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
          title: 'Pending Approvals',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Approval Details',
        }}
      />
    </Stack>
  );
}







































