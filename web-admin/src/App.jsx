import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { auth, configError } from './firebase/client.js'
import { useAdminSession } from './contexts/useAdminSession.js'
import LoginPage from './pages/LoginPage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import Brand from './components/Brand.jsx'

function StatusPanel({ title, description, children }) {
  return (
    <main className="center-screen">
      <section className="panel login-panel">
        <Brand />
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
        {children}
      </section>
    </main>
  )
}

function LogoutButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleLogout() {
    setPending(true)
    setError(false)
    try {
      await signOut(auth)
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button disabled={pending} onClick={handleLogout}>{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
      {error && <p className="error" role="alert">Đăng xuất thất bại. Hãy thử lại.</p>}
    </div>
  )
}

function AppRoutes() {
  const { status, user } = useAdminSession()

  if (status === 'checking') {
    return <StatusPanel title="Đang kiểm tra phiên đăng nhập…"><p role="status">Vui lòng đợi.</p></StatusPanel>
  }
  if (status === 'denied' || status === 'error') {
    return (
      <StatusPanel
        title={status === 'denied' ? 'Tài khoản chưa được cấp quyền' : 'Không xác minh được quyền quản trị'}
        description={status === 'denied' ? 'UID của tài khoản chưa có trong collection admins.' : 'Hãy kiểm tra mạng và Firestore Rules rồi đăng nhập lại.'}
      >
        <LogoutButton />
      </StatusPanel>
    )
  }

  const admin = status === 'admin'
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/products" replace /> : <LoginPage />} />
      <Route path="/products" element={admin ? <ProductsPage email={user.email} logout={<LogoutButton />} /> : <Navigate to="/login" replace />} />
      <Route path="/users" element={<Navigate to="/products" replace />} />
      <Route path="*" element={<Navigate to={admin ? '/products' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  if (configError) return <StatusPanel title="Cấu hình Firebase" description={configError} />
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
