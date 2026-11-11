import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/client.js'
import Brand from '../components/Brand.jsx'

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
    <main className="center-screen login-screen">
      <aside className="login-story">
        <Brand />
        <div><p className="eyebrow">DANH MỤC SẢN PHẨM</p><h2>Quản lý dễ dàng.<br />Đồng bộ trên mọi thiết bị.</h2><p>Thông tin sản phẩm luôn trong tầm tay, trên web và ứng dụng của bạn.</p></div>
        <div className="story-card"><span className="story-icon" aria-hidden="true">↔</span><div><strong>Đồng bộ trên mọi thiết bị</strong><p>Một danh sách chung, cập nhật theo thời gian thực.</p></div></div>
        <p className="story-footer">userly · Không gian quản trị của bạn</p>
      </aside>
      <section className="panel login-panel" aria-labelledby="login-title">
        <Brand />
        <p className="eyebrow login-eyebrow">CHÀO MỪNG TRỞ LẠI</p>
        <h1 id="login-title">Đăng nhập</h1>
        <p className="muted">Đăng nhập để quản lý danh mục sản phẩm.</p>
        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={loading}>
            <label>Email quản trị<input type="email" placeholder="admin@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Mật khẩu<input type="password" placeholder="Nhập mật khẩu của bạn" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <p role="alert" className="error">{error}</p>}
            <button className="primary full" type="submit">{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
          </fieldset>
        </form>
        <p className="login-footnote">Dành cho tài khoản đã được cấp quyền quản trị.</p>
      </section>
    </main>
  )
}
