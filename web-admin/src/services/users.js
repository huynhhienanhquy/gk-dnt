import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'

export const userFields = [
  { name: 'hoten', label: 'Họ và tên', type: 'text', maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', maxLength: 254 },
  { name: 'matkhau', label: 'Mật khẩu demo', type: 'text', maxLength: 100 },
  { name: 'hinhanh', label: 'URL hình ảnh', type: 'url', maxLength: 2048 },
]

export function validateUser(values) {
  const data = Object.fromEntries(userFields.map(({ name }) => [name, values[name].trim()]))
  for (const { name, label, maxLength } of userFields) {
    if (!data[name]) throw new Error(`Vui lòng nhập ${label.toLowerCase()}.`)
    if (data[name].length > maxLength) throw new Error(`${label} vượt quá ${maxLength} ký tự.`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Email không đúng định dạng.')
  }
  if (!/^https:\/\/[^\s/@?#]+([/?#][^\s]*)?$/.test(data.hinhanh) || !URL.canParse(data.hinhanh)) {
    throw new Error('Hãy nhập URL ảnh hợp lệ bắt đầu bằng https://.')
  }
  return data
}

export function subscribeToUsers(onUsers, onError) {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))
    users.sort((first, second) => String(first.hoten ?? '').localeCompare(String(second.hoten ?? ''), 'vi'))
    onUsers(users)
  }, onError)
}

export function saveUser(id, data) {
  if (id) return updateDoc(doc(db, 'users', id), data)
  return addDoc(collection(db, 'users'), data)
}

export function removeUser(id) {
  return deleteDoc(doc(db, 'users', id))
}
