import { cert } from 'firebase-admin/app'
import admin from 'firebase-admin'
import firebaseJSONConfig from 'config/carpil-firebase-config.json'

const firebaseConfig = process.env.FIREBASE_CONFIG ?? JSON.stringify(firebaseJSONConfig)

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: cert(JSON.parse(firebaseConfig))
  })
}

export const auth = admin.auth()
export const firestore = admin.firestore()
