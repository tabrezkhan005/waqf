import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogButton } from '@/components/ui/dialog';
import { Ionicons } from '@expo/vector-icons';

interface DialogContextType {
  showDialog: (
    title: string,
    message: string,
    buttons?: DialogButton[],
    icon?: keyof typeof Ionicons.glyphMap,
    iconColor?: string
  ) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<DialogButton[]>([{ text: 'OK', onPress: () => {} }]);
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap | undefined>();
  const [iconColor, setIconColor] = useState('#0A7E43');

  const showDialog = (
    title: string,
    message: string,
    buttons?: DialogButton[],
    icon?: keyof typeof Ionicons.glyphMap,
    iconColor?: string
  ) => {
    setTitle(title);
    setMessage(message);
    setButtons(buttons || [{ text: 'OK', onPress: () => {} }]);
    setIcon(icon);
    setIconColor(iconColor || '#0A7E43');
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <Dialog
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
        onDismiss={hideDialog}
        icon={icon}
        iconColor={iconColor}
      />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}























