import Expo from "expo-server-sdk"

interface SendPushNotificationProps {
  pushTokens: string[]
  title: string
  body: string
  data?: Record<string, any>
}

const expo = new Expo()

export const sendPushNotifications = async ({ pushTokens, title, body, data }: SendPushNotificationProps) => {
  const pushNotifications: any[] = []
  for (const pushToken of pushTokens) {
    if (Expo.isExpoPushToken(pushToken)) {
      pushNotifications.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data
      })
    }
  }

  if (pushNotifications.length > 0) {
    await expo.sendPushNotificationsAsync(pushNotifications)
  }
}