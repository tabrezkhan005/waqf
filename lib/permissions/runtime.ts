import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

const PERMISSIONS_KEY = 'permissions_requested_v1';

export type PermissionSummary = {
  notifications: 'granted' | 'denied' | 'undetermined';
  mediaLibrary: 'granted' | 'denied' | 'undetermined';
};

function normalizeAndroidGrant(granted: boolean): 'granted' | 'denied' {
  return granted ? 'granted' : 'denied';
}

export async function requestEssentialPermissionsOnce(): Promise<PermissionSummary> {
  const already = await AsyncStorage.getItem(PERMISSIONS_KEY);
  if (already === 'true') {
    return {
      // We only request on Android using native permissions.
      notifications: 'undetermined',
      // Storage is handled by the export flow using Android SAF picker.
      mediaLibrary: 'undetermined',
    };
  }

  const allow = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Allow permissions',
      'To send important updates and download exported reports, please allow Notifications and Storage access.',
      [
        { text: 'Later', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Allow', onPress: () => resolve(true) },
      ]
    );
  });

  if (!allow) {
    await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
    return { notifications: 'undetermined', mediaLibrary: 'undetermined' };
  }

  // Notifications: request POST_NOTIFICATIONS on Android 13+.
  // Note: Must be declared in app.json android.permissions.
  let notif: 'granted' | 'denied' | 'undetermined' = 'undetermined';
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
      title: 'Allow notifications',
      message: 'We use notifications to show important updates (approvals, announcements, payments).',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    notif = normalizeAndroidGrant(result === PermissionsAndroid.RESULTS.GRANTED);
  }

  // Storage: exports use Storage Access Framework (folder picker) at export time,
  // which is the most reliable approach across Android versions.
  const media: 'granted' | 'denied' | 'undetermined' = 'undetermined';

  await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');

  return {
    notifications: notif,
    mediaLibrary: media,
  };
}
