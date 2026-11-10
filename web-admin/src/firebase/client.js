import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app
let configError = ''
let auth
let db

try {
  if (Object.values(config).some((value) => !value?.trim())) {
    configError = 'Hãy điền bốn biến Firebase trong web-admin/.env.local rồi khởi động lại Vite.'
  } else {
    app = initializeApp(config)
    auth = getAuth(app)
    db = getFirestore(app)
  }
} catch {
  configError = 'Cấu hình Firebase không hợp lệ. Kiểm tra lại thông tin Web App trong .env.local.'
}

export { auth, configError, db }
