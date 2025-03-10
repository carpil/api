import admin from 'firebase-admin'
import serviceAccountKey from './carpil-firebase-config.json'

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey as admin.ServiceAccount)
  })
}

export const auth = admin.auth()
export const firestore = admin.firestore()
