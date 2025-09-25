import { cert } from 'firebase-admin/app'
import admin from 'firebase-admin'

if (admin.apps.length === 0) {
  try {
    const serviceAccount = require('./firebase-service-account.json')
    admin.initializeApp({
      credential: cert(serviceAccount)
    })
  } catch (error) {
    console.log('Service account file not found, trying environment variables')
    if (process.env.FIREBASE_CONFIG) {
      admin.initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_CONFIG))
      })
    } else {
      admin.initializeApp()
    }
  }
}

export const auth = admin.auth()
export const firestore = admin.firestore()
