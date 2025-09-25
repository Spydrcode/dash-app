'use client';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
}

interface NotificationProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const NotificationItem = ({ notification, onClose }: NotificationProps) => {
  useEffect(() => {
    if (notification.autoClose) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, 5000); // 5 second auto-close
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.autoClose, onClose]);

  const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-green-600" />,
    error: <XCircleIcon className="w-6 h-6 text-red-600" />,
    info: <CheckCircleIcon className="w-6 h-6 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200', 
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className={`rounded-lg border p-4 shadow-lg ${bgColors[notification.type]} transform transition-all duration-300`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icons[notification.type]}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {notification.title}
          </h3>
          <p className="mt-1 text-sm text-gray-700">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Listen for custom notification events
  useEffect(() => {
    const handleNotificationEvent = (event: CustomEvent) => {
      addNotification(event.detail);
    };

    window.addEventListener('addNotification', handleNotificationEvent as EventListener);
    return () => window.removeEventListener('addNotification', handleNotificationEvent as EventListener);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

// Helper function to trigger notifications from anywhere
export const showNotification = (notification: Omit<Notification, 'id'>) => {
  window.dispatchEvent(new CustomEvent('addNotification', { detail: notification }));
};