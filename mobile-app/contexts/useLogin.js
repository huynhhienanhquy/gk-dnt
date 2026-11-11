import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/client.js'

const messages = {
  'auth/invalid-email': 'Email không đúng định dạng.',
  'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
  'auth/user-not-found': 'Email hoặc mật khẩu không chính xác.',
  'auth/wrong-password': 'Email hoặc mật khẩu không chính xác.',
  'auth/network-request-failed': 'Không kết nối được với Firebase. Hãy kiểm tra mạng.',
  'auth/too-many-requests': 'Đã thử đăng nhập quá nhiều lần. Hãy thử lại sau.',
}

export function useLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    if (busy) return
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (failure) {
      setError(messages[failure.code] ?? 'Không đăng nhập được. Hãy thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return { email, setEmail, password, setPassword, busy, error, login }
}
