/**
 * Convenience hook for common dialog patterns
 */

import { useDialog } from '@/contexts/DialogContext';
import { DialogButton } from '@/components/ui/dialog';
import { Ionicons } from '@expo/vector-icons';

export function useDialogHelpers() {
  const { showDialog, hideDialog } = useDialog();

  const showAlert = (
    title: string,
    message: string,
    onOk?: () => void
  ) => {
    showDialog(
      title,
      message,
      [{ text: 'OK', onPress: onOk || (() => {}) }],
      'information-circle',
      '#0A7E43'
    );
  };

  const showError = (
    title: string,
    message: string,
    onOk?: () => void
  ) => {
    showDialog(
      title,
      message,
      [{ text: 'OK', onPress: onOk || (() => {}) }],
      'close-circle',
      '#EF4444'
    );
  };

  const showSuccess = (
    title: string,
    message: string,
    onOk?: () => void
  ) => {
    showDialog(
      title,
      message,
      [{ text: 'OK', onPress: onOk || (() => {}) }],
      'checkmark-circle',
      '#0A7E43'
    );
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showDialog(
      title,
      message,
      [
        { text: 'Cancel', onPress: onCancel || (() => {}), style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ],
      'help-circle',
      '#0A7E43'
    );
  };

  return {
    showAlert,
    showError,
    showSuccess,
    showConfirm,
    showDialog,
    hideDialog,
  };
}























