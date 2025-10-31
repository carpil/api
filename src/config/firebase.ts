import { cert } from 'firebase-admin/app'
import admin from 'firebase-admin'
import { FieldValue as FirestoreFieldValue } from 'firebase-admin/firestore'

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


const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || '(default)'

// Initialize firestore with specific database
const firestoreInstance = admin.firestore()
if (DATABASE_ID !== '(default)') {
  firestoreInstance.settings({ databaseId: DATABASE_ID })
}

export const auth = admin.auth()
export const firestore = firestoreInstance
export const FieldValue = FirestoreFieldValue
