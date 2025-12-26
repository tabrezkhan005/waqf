import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Generate a unique device ID for device binding
 * Uses device ID if available, otherwise generates a persistent ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get device ID
    if (Device.deviceId) {
      return Device.deviceId;
    }

    // Fallback: generate a device-specific ID
    // In production, you might want to use a more robust solution
    // like expo-application's androidId or iOS identifierForVendor
    const deviceInfo = {
      brand: Device.brand || 'unknown',
      modelName: Device.modelName || 'unknown',
      osName: Device.osName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
    };

    // Create a hash-like identifier
    const deviceString = `${deviceInfo.brand}-${deviceInfo.modelName}-${deviceInfo.osName}-${deviceInfo.osVersion}`;

    // For a more robust solution, consider using:
    // - expo-application (androidId, iOSId)
    // - Or store a UUID in SecureStore on first launch

    return deviceString;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a generic ID (not ideal, but better than crashing)
    return `device-${Platform.OS}-${Date.now()}`;
  }
}




