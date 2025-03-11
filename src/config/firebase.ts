import { cert } from 'firebase-admin/app'
import admin from 'firebase-admin'

const firebaseConfig = process.env.FIREBASE_CONFIG ?? ''

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: cert(JSON.parse(firebaseConfig))
  })
}

export const auth = admin.auth()
export const firestore = admin.firestore()
