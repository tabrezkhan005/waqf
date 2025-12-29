import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function timestampForFilename(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(
    date.getHours()
  )}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

export async function saveAndShareTextFile(opts: {
  filename: string;
  mimeType: string;
  contents: string;
}): Promise<{ uri: string }> {
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const SAF = (FileSystem as any).StorageAccessFramework || (FileSystem as any).storageAccessFramework || null;

  let uri: string | null = null;

  // 1) Try app directory first (best UX)
  if (baseDir) {
    try {
      uri = `${baseDir}${opts.filename}`;
      await FileSystem.writeAsStringAsync(uri, opts.contents);
    } catch (e) {
      uri = null;
      // Fall through to SAF on Android
    }
  }

  // 2) Fallback (Android): Storage Access Framework (user picks folder)
  if (!uri && Platform.OS === 'android' && SAF?.requestDirectoryPermissionsAsync) {
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm?.granted) {
      throw new Error('Storage permission denied');
    }
    const safUri = await SAF.createFileAsync(perm.directoryUri, opts.filename, opts.mimeType);
    await FileSystem.writeAsStringAsync(safUri, opts.contents);
    uri = safUri;
  }

  if (!uri) {
    throw new Error('No writable directory available for export');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    // Still return the file path so it can be accessed via device file manager/dev tools
    return { uri: uri! };
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: opts.mimeType,
      dialogTitle: 'Export report',
      // UTI is iOS-only; keep simple & compatible
    });
  } catch {
    // If sharing fails (e.g., content:// URIs on some Android setups),
    // the file is still saved (especially in SAF mode). Don't crash.
  }

  return { uri };
}
