import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Notification, NotificationType } from '@/components/ui/notification';

interface NotificationContextType {
  showNotification: (
    message: string,
    type?: NotificationType,
    duration?: number,
    action?: { label: string; onPress: () => void }
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [duration, setDuration] = useState(3000);
  const [action, setAction] = useState<{ label: string; onPress: () => void } | undefined>();

  const showNotification = (
    message: string,
    type: NotificationType = 'info',
    duration: number = 3000,
    action?: { label: string; onPress: () => void }
  ) => {
    setMessage(message);
    setType(type);
    setDuration(duration);
    setAction(action);
    setVisible(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setAction(undefined);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Notification
        visible={visible}
        message={message}
        type={type}
        duration={duration}
        onDismiss={handleDismiss}
        action={action}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}









