// Global notification state
let globalSetNotifications = null;
let globalSetConfirmDialog = null;

export function showNotification(message, type = 'info', duration = 4000) {
  if (globalSetNotifications) {
    const id = Date.now() + Math.random();
    globalSetNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      globalSetNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }
}

export function showConfirmDialog(message, onConfirm, onCancel) {
  if (globalSetConfirmDialog) {
    globalSetConfirmDialog({ show: true, message, onConfirm, onCancel });
  }
}

export function initNotificationSystem(setNotifications, setConfirmDialog) {
  globalSetNotifications = setNotifications;
  globalSetConfirmDialog = setConfirmDialog;
}
