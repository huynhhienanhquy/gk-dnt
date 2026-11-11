import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'

export const userFields = [
  { name: 'hoten', label: 'Họ và tên', type: 'text', maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', maxLength: 254 },
  { name: 'matkhau', label: 'Mật khẩu demo', type: 'text', maxLength: 100 },
]

export const maxAvatarLength = 180_000

function isValidImage(value) {
  if (value.startsWith('data:image/jpeg;base64,')) {
    return value.length <= maxAvatarLength && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
  }
  try {
    return value.length <= 2048 && /^https:\/\/[^\s/@?#]+([/?#][^\s]*)?$/.test(value) && Boolean(new URL(value).hostname)
  } catch {
    return false
  }
}

export function validateUser(values) {
  const data = Object.fromEntries(userFields.map(({ name }) => [name, values[name].trim()]))
  for (const { name, label, maxLength } of userFields) {
    if (!data[name]) throw new Error(`Vui lòng nhập ${label.toLowerCase()}.`)
    if (data[name].length > maxLength) throw new Error(`${label} vượt quá ${maxLength} ký tự.`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Email không đúng định dạng.')
  }
  const image = String(values.hinhanh ?? '').trim()
  if (!image) throw new Error('Vui lòng chọn ảnh từ thiết bị.')
  if (!isValidImage(image)) throw new Error('Ảnh không hợp lệ. Hãy chọn lại ảnh từ thiết bị.')
  return { ...data, hinhanh: image }
}

export function subscribeToUsers(onUsers, onError) {
  return onSnapshot(collection(db, 'users'), { includeMetadataChanges: true }, (snapshot) => {
    const users = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))
    users.sort((first, second) => String(first.hoten ?? '').localeCompare(String(second.hoten ?? ''), 'vi'))
    onUsers(users, snapshot.metadata.fromCache)
  }, onError)
}

export function saveUser(id, data) {
  if (id) return updateDoc(doc(db, 'users', id), data)
  return addDoc(collection(db, 'users'), data)
}

export function removeUser(id) {
  return deleteDoc(doc(db, 'users', id))
}
