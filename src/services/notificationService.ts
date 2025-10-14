export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationOptions {
  title: string;
  body: string;
  priority?: NotificationPriority;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  async initialize(): Promise<boolean> {
    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async sendNotification(options: NotificationOptions): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.priority === 'high',
      ...options
    };

    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.showNotification(
        options.title,
        notificationOptions
      );
    } else {
      new Notification(options.title, notificationOptions);
    }
  }

  async sendAlarmNotification(
    message: string,
    severity: 'info' | 'warning' | 'danger'
  ): Promise<void> {
    const priorityMap: Record<typeof severity, NotificationPriority> = {
      info: 'low',
      warning: 'normal',
      danger: 'high'
    };

    await this.sendNotification({
      title: severity === 'danger' ? 'Alerta de Objetos' : 'Recordatorio',
      body: message,
      priority: priorityMap[severity],
      tag: 'alarm',
      icon: '/favicon.ico'
    });
  }

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }
}

export const notificationService = new NotificationService();
