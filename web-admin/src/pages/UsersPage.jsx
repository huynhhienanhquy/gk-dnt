import { useEffect, useState } from 'react'
import UserForm from '../components/UserForm.jsx'
import { removeUser, subscribeToUsers } from '../services/users.js'

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
  const actionsDisabled = Boolean(editor) || deleting

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
    <main className="workspace">
      <header className="toolbar">
        <div>
          <p className="eyebrow">WEB ADMIN</p>
          <h1>Quản lý người dùng</h1>
          <p className="muted">Đang đăng nhập với {email}</p>
        </div>
        {logout}
      </header>
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
            {list.status === 'ready' && <p className="muted">{list.users.length} người dùng demo</p>}
          </div>
          <button className="primary" onClick={() => openEditor()} disabled={actionsDisabled}>Thêm người dùng</button>
        </div>
        {list.status === 'loading' && <p className="table-status" role="status">Đang tải danh sách…</p>}
        {list.status === 'error' && (
          <div className="table-status">
            <p className="error" role="alert">Không tải được danh sách. Hãy kiểm tra mạng và Firestore Rules.</p>
            <button onClick={retry}>Thử lại</button>
          </div>
        )}
        {list.status === 'ready' && (list.users.length === 0 ? (
          <p className="table-status muted">Danh sách trống. Chọn Thêm người dùng để bắt đầu.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Họ và tên</th><th scope="col">Email</th><th scope="col">Mật khẩu demo</th><th scope="col">Thao tác</th></tr></thead>
              <tbody>
                {list.users.map((user) => (
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
    </main>
  )
}
