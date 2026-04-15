import { cert } from 'firebase-admin/app'
import admin from 'firebase-admin'
import { FieldValue as FirestoreFieldValue } from 'firebase-admin/firestore'

if (admin.apps.length === 0) {
  const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

  if (isEmulator) {
    // Local / OSS — emulador, no se necesitan credenciales reales
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-carpil'
    })
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Dev / QA / Prod — credenciales desde variables de entorno
    admin.initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    })
  } else if (process.env.FIREBASE_CONFIG) {
    // Dev / QA / Prod — credenciales como JSON string
    admin.initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_CONFIG))
    })
  } else {
    throw new Error(
      'Firebase no configurado. En local asegúrate que FIRESTORE_EMULATOR_HOST esté seteado. ' +
      'En otros ambientes provee FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY o FIREBASE_CONFIG.'
    )
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
