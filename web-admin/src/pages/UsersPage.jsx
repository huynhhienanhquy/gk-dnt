import { useEffect, useState } from 'react'
import UserForm from '../components/UserForm.jsx'
import Brand from '../components/Brand.jsx'
import { removeUser, subscribeToUsers } from '../services/users.js'

function normalizeSearch(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd')
}

function Avatar({ name, url }) {
  const [failed, setFailed] = useState(false)
  const initial = name?.trim().charAt(0).toUpperCase() || '?'
  return url && !failed
    ? <img className="avatar" src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <span className="avatar avatar-fallback" aria-hidden="true">{initial}</span>
}

export default function UsersPage({ email, logout }) {
  const [list, setList] = useState({ status: 'loading', users: [] })
  const [subscription, setSubscription] = useState(0)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const actionsDisabled = Boolean(editor) || deleting
  const query = normalizeSearch(search.trim())
  const visibleUsers = query ? list.users.filter(({ hoten, email }) => (
    normalizeSearch(hoten).includes(query) || normalizeSearch(email).includes(query)
  )) : list.users

  useEffect(() => subscribeToUsers(
    (users) => setList({ status: 'ready', users }),
    () => setList({ status: 'error', users: [] }),
  ), [subscription])

  async function handleDelete(user) {
    if (!window.confirm('Xóa người dùng ' + (user.hoten || user.email) + '?')) return

    setDeleting(true)
    setNotice(null)
    try {
      await removeUser(user.id)
      setNotice({ text: 'Đã xóa người dùng.' })
    } catch (error) {
      setNotice({ error: true, text: error.code === 'permission-denied'
        ? 'Firestore từ chối xóa. Hãy kiểm tra quyền quản trị.'
        : 'Không xóa được người dùng. Hãy thử lại.' })
    } finally {
      setDeleting(false)
    }
  }

  function openEditor(user = null) {
    setNotice(null)
    setEditor({ user })
  }

  function retry() {
    setList({ status: 'loading', users: [] })
    setSubscription((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">KHÔNG GIAN LÀM VIỆC</p>
        <a className="nav-item" href="/users" aria-current="page"><span aria-hidden="true">◉</span> Người dùng <span className="nav-count">{list.status === 'ready' ? list.users.length : '…'}</span></a>
        <div className="sidebar-note"><span aria-hidden="true">↔</span><strong>Kết nối liền mạch</strong><p>Dữ liệu dùng chung trên web và ứng dụng.</p></div>
        <div className="sidebar-account"><span className="avatar avatar-fallback" aria-hidden="true">{email?.charAt(0).toUpperCase()}</span><div><strong>Quản trị viên</strong><p title={email}>{email}</p></div></div>
      </aside>
    <main className="workspace">
      <div className="topbar"><span>Không gian làm việc <span aria-hidden="true">/</span> <strong>Người dùng</strong></span>{logout}</div>
      <header className="toolbar">
        <div>
          <p className="eyebrow">DANH BẠ CỦA BẠN</p>
          <h1>Người dùng</h1>
          <p className="muted">Quản lý thông tin, kết nối mọi người ở cùng một nơi.</p>
        </div>
        <button className="primary" onClick={() => openEditor()} disabled={actionsDisabled}><span aria-hidden="true">＋</span> Thêm người dùng</button>
      </header>
      <section className="overview" aria-label="Tổng quan danh bạ">
        <div className="stat-card"><span className="stat-icon" aria-hidden="true">◉</span><div><p>Tổng người dùng</p><strong>{list.status === 'ready' ? list.users.length : '—'}</strong></div><span className="stat-caption">Trong danh bạ</span></div>
        <div className="overview-note"><span className="stat-icon" aria-hidden="true">↔</span><div><strong>Một danh bạ, mọi thiết bị</strong><p>Thay đổi được cập nhật tự động trên web và app.</p></div></div>
      </section>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'error' : 'success'}>{notice.text}</p>}
      {editor && (
        <UserForm user={editor.user} onCancel={() => setEditor(null)} onSaved={(text) => {
          setEditor(null)
          setNotice({ text })
        }} />
      )}
      <section className="panel" aria-labelledby="list-title">
        <div className="toolbar list-toolbar">
          <div>
            <h2 id="list-title">Danh sách người dùng</h2>
            <p className="muted">Thông tin của tất cả người dùng trong không gian của bạn.</p>
          </div>
          <span className="count-badge">{list.status === 'ready' ? `${list.users.length} người dùng` : 'Đang tải…'}</span>
        </div>
        {list.status === 'ready' && (
          <div className="list-search">
            <label>
              <span className="sr-only">Tìm người dùng</span>
              <input type="search" placeholder="Nhập họ tên hoặc email" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {query && <p className="muted" role="status">Kết quả tìm kiếm: {visibleUsers.length}</p>}
          </div>
        )}
        {list.status === 'loading' && <p className="table-status" role="status">Đang tải danh sách…</p>}
        {list.status === 'error' && (
          <div className="table-status">
            <p className="error" role="alert">Không tải được danh sách. Hãy kiểm tra mạng và Firestore Rules.</p>
            <button onClick={retry}>Thử lại</button>
          </div>
        )}
        {list.status === 'ready' && (list.users.length === 0 ? (
          <p className="table-status muted">Danh sách trống. Chọn Thêm người dùng để bắt đầu.</p>
        ) : visibleUsers.length === 0 ? (
          <p className="table-status muted">Không tìm thấy người dùng phù hợp.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Họ và tên</th><th scope="col">Email</th><th scope="col">Mật khẩu demo</th><th scope="col">Thao tác</th></tr></thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td><div className="person"><Avatar key={user.hinhanh} name={user.hoten} url={user.hinhanh} /><strong>{user.hoten}</strong></div></td>
                    <td>{user.email}</td>
                    <td><details><summary>Hiện giá trị</summary><span>{user.matkhau}</span></details></td>
                    <td><div className="actions">
                      <button disabled={actionsDisabled} onClick={() => openEditor(user)}>Sửa</button>
                      <button className="danger" disabled={actionsDisabled} onClick={() => handleDelete(user)}>Xóa</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
      <footer className="workspace-footer">userly <span>Không gian quản lý người dùng đa nền tảng</span></footer>
    </main>
    </div>
  )
}
