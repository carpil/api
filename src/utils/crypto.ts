import CryptoJS from 'crypto-js'

const SECRET = process.env.CHAT_SECRET || 'default-secret'

export function encryptMessage(plain: string): string {
  return CryptoJS.AES.encrypt(plain, SECRET).toString()
}

export function decryptMessage(cipher: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET)
    return bytes.toString(CryptoJS.enc.Utf8) || ''
  } catch (_e) {
    return ''
  }
}


