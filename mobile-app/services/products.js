import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'

export const productFields = [
  { name: 'name', label: 'Tên sản phẩm', type: 'text', maxLength: 100 },
  { name: 'price', label: 'Giá sản phẩm', type: 'number', min: 0, step: 'any' },
  { name: 'soluong', label: 'Số lượng', type: 'number', min: 0, step: 1 },
]

export const maxImageLength = 180_000

function isValidImage(value) {
  if (value.startsWith('data:image/jpeg;base64,')) {
    return value.length <= maxImageLength && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
  }
  try {
    return value.length <= 2048 && /^https:\/\/[^\s/@?#]+([/?#][^\s]*)?$/.test(value) && Boolean(new URL(value).hostname)
  } catch {
    return false
  }
}

export function validateProduct(values) {
  const name = String(values.name ?? '').trim()
  if (!name) throw new Error('Vui lòng nhập tên sản phẩm.')
  if (name.length > 100) throw new Error('Tên sản phẩm vượt quá 100 ký tự.')

  const priceInput = String(values.price ?? '').trim().replace(',', '.')
  const price = Number(priceInput)
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(priceInput) || !Number.isFinite(price) || price > Number.MAX_SAFE_INTEGER) {
    throw new Error('Giá sản phẩm phải là số không âm hợp lệ.')
  }

  const quantityInput = String(values.soluong ?? '').trim()
  const soluong = Number(quantityInput)
  if (!/^\d+$/.test(quantityInput) || !Number.isSafeInteger(soluong)) {
    throw new Error('Số lượng phải là số nguyên không âm hợp lệ.')
  }

  const image = String(values.image ?? '').trim()
  if (!image) throw new Error('Vui lòng chọn ảnh từ thiết bị.')
  if (!isValidImage(image)) throw new Error('Ảnh không hợp lệ. Hãy chọn lại ảnh từ thiết bị.')
  return { name, price, soluong, image }
}

export function subscribeToProducts(onProducts, onError) {
  return onSnapshot(collection(db, 'products'), { includeMetadataChanges: true }, (snapshot) => {
    const products = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))
    products.sort((first, second) => String(first.name ?? '').localeCompare(String(second.name ?? ''), 'vi'))
    onProducts(products, snapshot.metadata.fromCache)
  }, onError)
}

export function saveProduct(id, data) {
  if (id) return updateDoc(doc(db, 'products', id), data)
  return addDoc(collection(db, 'products'), data)
}

export function removeProduct(id) {
  return deleteDoc(doc(db, 'products', id))
}
