import { Redirect } from 'expo-router';

export default function AccountsIndex() {
  // Redirect to dashboard as default
  return <Redirect href="/accounts/dashboard" />;
}
