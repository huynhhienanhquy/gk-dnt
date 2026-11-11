import { useEffect, useState } from 'react'
import ProductForm from '../components/ProductForm.jsx'
import Brand from '../components/Brand.jsx'
import { removeProduct, subscribeToProducts } from '../services/products.js'

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

export default function ProductsPage({ email, logout }) {
  const [list, setList] = useState({ status: 'loading', products: [] })
  const [subscription, setSubscription] = useState(0)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const actionsDisabled = Boolean(editor) || deleting
  const query = normalizeSearch(search.trim())
  const visibleProducts = query ? list.products.filter(({ name }) => normalizeSearch(name).includes(query)) : list.products

  useEffect(() => subscribeToProducts(
    (products) => setList({ status: 'ready', products }),
    () => setList({ status: 'error', products: [] }),
  ), [subscription])

  async function handleDelete(product) {
    if (!window.confirm('Xóa sản phẩm ' + product.name + '?')) return

    setDeleting(true)
    setNotice(null)
    try {
      await removeProduct(product.id)
      setNotice({ text: 'Đã xóa sản phẩm.' })
    } catch (error) {
      setNotice({ error: true, text: error.code === 'permission-denied'
        ? 'Firestore từ chối xóa. Hãy kiểm tra quyền quản trị.'
        : 'Không xóa được sản phẩm. Hãy thử lại.' })
    } finally {
      setDeleting(false)
    }
  }

  function openEditor(product = null) {
    setNotice(null)
    setEditor({ product })
  }

  function retry() {
    setList({ status: 'loading', products: [] })
    setSubscription((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">KHÔNG GIAN LÀM VIỆC</p>
        <a className="nav-item" href="/products" aria-current="page"><span aria-hidden="true">◉</span> Sản phẩm <span className="nav-count">{list.status === 'ready' ? list.products.length : '…'}</span></a>
        <div className="sidebar-note"><span aria-hidden="true">↔</span><strong>Kết nối liền mạch</strong><p>Dữ liệu dùng chung trên web và ứng dụng.</p></div>
        <div className="sidebar-account"><span className="avatar avatar-fallback" aria-hidden="true">{email?.charAt(0).toUpperCase()}</span><div><strong>Quản trị viên</strong><p title={email}>{email}</p></div></div>
      </aside>
    <main className="workspace">
      <div className="topbar"><span>Không gian làm việc <span aria-hidden="true">/</span> <strong>Sản phẩm</strong></span>{logout}</div>
      <header className="toolbar">
        <div>
          <p className="eyebrow">DANH MỤC</p>
          <h1>Sản phẩm</h1>
          <p className="muted">Quản lý giá, số lượng và hình ảnh sản phẩm.</p>
        </div>
        <button className="primary" onClick={() => openEditor()} disabled={actionsDisabled}><span aria-hidden="true">＋</span> Thêm sản phẩm</button>
      </header>
      <section className="overview" aria-label="Tổng quan sản phẩm">
        <div className="stat-card"><span className="stat-icon" aria-hidden="true">◉</span><div><p>Tổng sản phẩm</p><strong>{list.status === 'ready' ? list.products.length : '—'}</strong></div><span className="stat-caption">Trong danh mục</span></div>
        <div className="overview-note"><span className="stat-icon" aria-hidden="true">↔</span><div><strong>Đồng bộ sản phẩm</strong><p>Thay đổi được cập nhật tự động trên web và app.</p></div></div>
      </section>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'error' : 'success'}>{notice.text}</p>}
      {editor && (
        <ProductForm product={editor.product} onCancel={() => setEditor(null)} onSaved={(text) => {
          setEditor(null)
          setNotice({ text })
        }} />
      )}
      <section className="panel" aria-labelledby="list-title">
        <div className="toolbar list-toolbar">
          <div>
            <h2 id="list-title">Danh sách sản phẩm</h2>
          </div>
          <span className="count-badge">{list.status === 'ready' ? `${list.products.length} sản phẩm` : 'Đang tải…'}</span>
        </div>
        {list.status === 'ready' && (
          <div className="list-search">
            <label>
              <span className="sr-only">Tìm sản phẩm</span>
              <input type="search" placeholder="Nhập tên sản phẩm" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {query && <p className="muted" role="status">Kết quả tìm kiếm: {visibleProducts.length}</p>}
          </div>
        )}
        {list.status === 'loading' && <p className="table-status" role="status">Đang tải danh sách…</p>}
        {list.status === 'error' && (
          <div className="table-status">
            <p className="error" role="alert">Không tải được danh sách. Hãy kiểm tra mạng và Firestore Rules.</p>
            <button onClick={retry}>Thử lại</button>
          </div>
        )}
        {list.status === 'ready' && (list.products.length === 0 ? (
          <p className="table-status muted">Danh sách trống. Chọn Thêm sản phẩm để bắt đầu.</p>
        ) : visibleProducts.length === 0 ? (
          <p className="table-status muted">Không tìm thấy sản phẩm phù hợp.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Tên sản phẩm</th><th scope="col">Giá</th><th scope="col">Số lượng</th><th scope="col">Thao tác</th></tr></thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td><div className="person"><Avatar key={product.image} name={product.name} url={product.image} /><strong>{product.name}</strong></div></td>
                    <td>{product.price.toLocaleString('vi-VN')}</td>
                    <td>{product.soluong.toLocaleString('vi-VN')}</td>
                    <td><div className="actions">
                      <button disabled={actionsDisabled} onClick={() => openEditor(product)}>Sửa</button>
                      <button className="danger" disabled={actionsDisabled} onClick={() => handleDelete(product)}>Xóa</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
      <footer className="workspace-footer">userly <span>Không gian quản lý sản phẩm đa nền tảng</span></footer>
    </main>
    </div>
  )
}
