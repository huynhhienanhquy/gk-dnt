import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'

export function subscribeToUsers(onUsers, onError) {
  return onSnapshot(collection(db, 'users'), { includeMetadataChanges: true }, (snapshot) => {
    const users = snapshot.docs.map((document) => {
      const { hoten, email, hinhanh } = document.data()
      return {
        id: document.id,
        hoten: typeof hoten === 'string' ? hoten : '',
        email: typeof email === 'string' ? email : '',
        hinhanh: typeof hinhanh === 'string' ? hinhanh : '',
      }
    })
    users.sort((first, second) => first.hoten.localeCompare(second.hoten, 'vi'))
    onUsers(users, snapshot.metadata.fromCache)
  }, onError)
}
