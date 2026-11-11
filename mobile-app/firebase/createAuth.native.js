import AsyncStorage from '@react-native-async-storage/async-storage'
import { getReactNativePersistence, initializeAuth } from 'firebase/auth'

export function createAuth(app) {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
}
