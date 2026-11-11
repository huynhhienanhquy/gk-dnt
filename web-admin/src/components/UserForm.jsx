import { useState } from 'react'
import { maxAvatarLength, saveUser, userFields, validateUser } from '../services/users.js'

export default function UserForm({ user, onCancel, onSaved }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    userFields.map(({ name }) => [name, String(user?.[name] ?? '')]),
  ))
  const [saving, setSaving] = useState(false)
  const [image, setImage] = useState(user?.hinhanh ?? '')
  const [readingImage, setReadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [error, setError] = useState('')

  async function handleImageChange(event) {
    const input = event.currentTarget
    const file = input.files[0]
    if (!file) return

    setReadingImage(true)
    setImageError('')
    setError('')
    try {
      if (file.type === 'image/svg+xml') throw new Error('Unsupported image')
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const avatar = canvas.toDataURL('image/jpeg', 0.8)
        if (!avatar.startsWith('data:image/jpeg;base64,') || avatar.length > maxAvatarLength) {
          throw new Error('Could not encode avatar')
        }
        setImage(avatar)
      } finally {
        bitmap.close()
      }
    } catch {
      input.value = ''
      setImageError('Không xử lý được ảnh. Hãy chọn ảnh khác.')
    } finally {
      setReadingImage(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (readingImage || imageError) return
    setError('')
    let data
    try {
      data = validateUser({ ...values, hinhanh: image })
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
                />
              </label>
            ))}
            <label>
              Ảnh đại diện
              <input type="file" accept="image/*" disabled={readingImage} onChange={handleImageChange} />
              {image && <img className="avatar" src={image} alt="Ảnh đại diện đã chọn" referrerPolicy="no-referrer" />}
            </label>
          </div>
          <p className="muted">Dùng email hư cấu và mật khẩu demo.</p>
          {imageError && <p className="error" role="alert">{imageError}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button className="primary" type="submit" disabled={readingImage || Boolean(imageError)}>{saving ? 'Đang lưu…' : readingImage ? 'Đang xử lý ảnh…' : 'Lưu'}</button>
            <button type="button" onClick={onCancel}>Hủy</button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
