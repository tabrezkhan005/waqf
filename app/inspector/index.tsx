import { Redirect } from 'expo-router';

export default function InspectorIndex() {
  // Redirect to dashboard as default
  return <Redirect href="/inspector/dashboard" />;
}
