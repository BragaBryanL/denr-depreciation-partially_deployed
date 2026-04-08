import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { initNotificationSystem } from '../utils/notificationHelpers';

// Notification types and their styles
const notificationStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-500',
    icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
    title: 'Success',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-500',
    icon: <XCircleIcon className="w-6 h-6 text-red-500" />,
    title: 'Error',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-500',
    icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />,
    title: 'Warning',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-500',
    icon: <InformationCircleIcon className="w-6 h-6 text-blue-500" />,
    title: 'Info',
  },
  confirm: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-500',
    icon: <BellIcon className="w-6 h-6 text-orange-500" />,
    title: 'Confirm',
  },
};


export function NotificationContainer({ notifications, setNotifications, confirmDialog, setConfirmDialog }) {
  // Store setters globally for external access
  useEffect(() => {
    initNotificationSystem(setNotifications, setConfirmDialog);
  }, [setNotifications, setConfirmDialog]);

  return (
    <>
      {/* Toast Notifications - z-60 to appear above navbar (z-50) */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-3 max-w-sm">
        {notifications.map((notification) => {
          const style = notificationStyles[notification.type] || notificationStyles.info;
          return (
            <div
              key={notification.id}
              className={`${style.bg} border-l-4 ${style.border} rounded-lg shadow-xl p-4 animate-slide-in-right`}
              style={{ animation: 'slideInRight 0.3s ease-out' }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {style.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {style.title}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Confirmation Dialog - z-60 to appear above navbar */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Confirm Action
                </h3>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  confirmDialog.onCancel?.();
                  setConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
                }}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm?.();
                  setConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
                }}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default NotificationContainer;
