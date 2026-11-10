import { useState } from 'react'
import { saveUser, userFields, validateUser } from '../services/users.js'

export default function UserForm({ user, onCancel, onSaved }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    userFields.map(({ name }) => [name, String(user?.[name] ?? '')]),
  ))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    let data
    try {
      data = validateUser(values)
    } catch (validationError) {
      setError(validationError.message)
      return
    }

    setSaving(true)
    try {
      await saveUser(user?.id, data)
      onSaved(user ? 'Đã cập nhật người dùng.' : 'Đã thêm người dùng.')
    } catch (saveError) {
      setError(saveError.code === 'permission-denied'
        ? 'Firestore từ chối lưu. Hãy kiểm tra quyền quản trị và dữ liệu.'
        : 'Không lưu được người dùng. Hãy thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel editor" aria-labelledby="user-form-title">
      <h2 id="user-form-title">{user ? 'Sửa người dùng' : 'Thêm người dùng'}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={saving}>
          <div className="form-grid">
            {userFields.map(({ name, label, type, maxLength }) => (
              <label key={name}>
                {label}
                <input
                  type={type}
                  value={values[name]}
                  maxLength={maxLength}
                  required
                  onChange={(event) => setValues({ ...values, [name]: event.target.value })}
                  placeholder={name === 'hinhanh' ? 'https://…' : undefined}
                />
              </label>
            ))}
          </div>
          <p className="muted">Dùng email hư cấu, giá trị mật khẩu demo và URL ảnh HTTPS công khai.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button className="primary" type="submit">{saving ? 'Đang lưu…' : 'Lưu'}</button>
            <button type="button" onClick={onCancel}>Hủy</button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
