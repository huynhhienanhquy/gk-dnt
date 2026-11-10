import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

let db
let configError = ''
try {
  if (Object.values(config).some((value) => !value?.trim())) {
    configError = 'Điền bốn biến Firebase trong mobile-app/.env.local rồi khởi động lại Expo.'
  } else {
    db = getFirestore(initializeApp(config))
  }
} catch {
  configError = 'Cấu hình Firebase không hợp lệ. Hãy kiểm tra lại thông tin Web App.'
}

export { configError, db }
