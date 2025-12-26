import { Redirect } from 'expo-router';

export default function ReportsIndex() {
  // Redirect to overview as default
  return <Redirect href="/reports/overview" />;
}
