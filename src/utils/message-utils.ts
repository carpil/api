import CryptoJS from 'crypto-js'

const secretKey = process.env.CHAT_SECRET_KEY ?? ''

export const encryptMessage = (message: string): string => {
  return CryptoJS.AES.encrypt(message, secretKey).toString()
}

export const decryptMessage = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    return ciphertext
  }
} 