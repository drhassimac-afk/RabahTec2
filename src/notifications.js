import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function initNotifications() {
  try {
    await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'الرسائل',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  } catch {}
}

export function notify(title, body) {
  Notifications.scheduleNotificationAsync({
    content: { title, body, channelId: 'messages' },
    trigger: null, // فوري
  }).catch(() => {});
}
