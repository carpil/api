import { getStorage } from 'firebase-admin/storage'

export async function uploadToStorage (
  path: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ?? 'carpil-ef6b9.appspot.com'
  const bucket = getStorage().bucket(bucketName)
  const file = bucket.file(path)

  await file.save(fileBuffer, {
    contentType: mimeType,
    metadata: { contentType: mimeType }
  })

  await file.makePublic()

  return `https://storage.googleapis.com/${bucket.name}/${path}`
}
