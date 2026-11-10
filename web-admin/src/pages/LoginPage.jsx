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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (signInError) {
      setError(messages[signInError.code] ?? 'Không đăng nhập được. Hãy kiểm tra cấu hình và thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="center-screen">
      <section className="panel login-panel" aria-labelledby="login-title">
        <p className="eyebrow">WEB ADMIN</p>
        <h1 id="login-title">Quản lý người dùng</h1>
        <p className="muted">Đăng nhập bằng tài khoản quản trị Firebase.</p>
        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={loading}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <p role="alert" className="error">{error}</p>}
            <button className="primary full" type="submit">{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
          </fieldset>
        </form>
      </section>
    </main>
  )
}
