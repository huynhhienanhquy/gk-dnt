import assert from 'node:assert/strict'
import { EventEmitter, on } from 'node:events'
import { readFile } from 'node:fs/promises'
import { deleteApp, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { addDoc, collection, connectFirestoreEmulator, deleteDoc, doc, getDocFromServer, getFirestore, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'

function localPort(variable) {
  const address = /^(127\.0\.0\.1|localhost):(\d+)$/.exec(process.env[variable] ?? '')
  assert.ok(address, `${variable} phải trỏ tới emulator cục bộ. Chạy qua firebase emulators:exec.`)
  return Number(address[2])
}

const authPort = localPort('FIREBASE_AUTH_EMULATOR_HOST')
const firestorePort = localPort('FIRESTORE_EMULATOR_HOST')
const projectId = 'demo-gk-dnt'
const apps = []

function createClient(name) {
  const app = initializeApp({ apiKey: 'demo-key', projectId }, name)
  apps.push(app)
  const auth = getAuth(app)
  const db = getFirestore(app)
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', firestorePort)
  return { auth, db }
}

async function grantAdmin(uid) {
  const response = await fetch(
    `http://127.0.0.1:${firestorePort}/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { active: { booleanValue: true } } }),
    },
  )
  assert.ok(response.ok, await response.text())
}

const permissionDenied = { code: 'permission-denied' }
const [sample] = JSON.parse(await readFile(new URL('../../database/products-demo.json', import.meta.url), 'utf8'))
let unsubscribe
let snapshots

try {
  const admin = createClient('admin')
  const other = createClient('other')
  const viewer = createClient('viewer')
  const email = 'admin@example.com'
  const password = 'local-emulator-password'
  const { user } = await createUserWithEmailAndPassword(admin.auth, email, password)
  await grantAdmin(user.uid)
  await signOut(admin.auth)
  await assert.rejects(signInWithEmailAndPassword(admin.auth, email, 'wrong-password'), (error) =>
    ['auth/wrong-password', 'auth/invalid-credential'].includes(error.code))
  const signedIn = await signInWithEmailAndPassword(admin.auth, email, password)
  assert.equal(signedIn.user.uid, user.uid)
  assert.ok((await getDocFromServer(doc(admin.db, 'admins', user.uid))).exists())
  console.log('PASS Auth accepts the admin credentials and rejects the wrong password')

  const ordinary = await createUserWithEmailAndPassword(other.auth, 'ordinary@example.com', password)
  const ownGrant = doc(other.db, 'admins', ordinary.user.uid)
  assert.equal((await getDocFromServer(ownGrant)).exists(), false)
  await assert.rejects(getDocFromServer(doc(other.db, 'admins', user.uid)), permissionDenied)
  await assert.rejects(setDoc(ownGrant, { active: true }), permissionDenied)
  await assert.rejects(addDoc(collection(viewer.db, 'products'), sample), permissionDenied)
  await assert.rejects(addDoc(collection(other.db, 'products'), sample), permissionDenied)
  console.log('PASS Anonymous and non-admin clients cannot write or grant access')

  const events = new EventEmitter()
  snapshots = on(events, 'snapshot', { signal: AbortSignal.timeout(45_000) })
  unsubscribe = onSnapshot(collection(viewer.db, 'products'), { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache) events.emit('snapshot', snapshot)
  }, (error) => events.emit('error', error))

  async function waitForSnapshot(predicate) {
    for (;;) {
      const { value, done } = await snapshots.next()
      assert.equal(done, false)
      const [snapshot] = value
      if (predicate(snapshot)) return snapshot
    }
  }

  await waitForSnapshot(() => true)
  const products = collection(admin.db, 'products')
  const created = await addDoc(products, sample)
  const visibleIn = (snapshot) => snapshot.docs.find((entry) => entry.id === created.id)
  const afterCreate = await waitForSnapshot((snapshot) => Boolean(visibleIn(snapshot)))
  assert.deepEqual(visibleIn(afterCreate).data(), sample)
  assert.deepEqual((await getDocFromServer(created)).data(), sample)

  await assert.rejects(updateDoc(doc(other.db, 'products', created.id), { name: 'Blocked' }), permissionDenied)
  await assert.rejects(deleteDoc(doc(viewer.db, 'products', created.id)), permissionDenied)
  const missingImage = { name: sample.name, price: sample.price, soluong: sample.soluong }
  await assert.rejects(addDoc(products, missingImage), permissionDenied)
  for (const change of [{ extra: true }, { name: '   ' }, { price: '890000' }, { price: -1 }, { soluong: -1 }, { soluong: 1.5 }, { image: 'http://example.com/image.png' }]) {
    await assert.rejects(addDoc(products, { ...sample, ...change }), permissionDenied)
  }
  await assert.rejects(updateDoc(created, { name: '' }), permissionDenied)
  console.log('PASS Rules require exactly four valid fields on create and update')

  const newName = 'Tên đã cập nhật'
  const changes = { name: newName, price: 19.5, soluong: 0 }
  await updateDoc(created, changes)
  const afterUpdate = await waitForSnapshot((snapshot) => visibleIn(snapshot)?.data().name === newName)
  assert.deepEqual(visibleIn(afterUpdate).data(), { ...sample, ...changes })
  const jpegPrefix = 'data:image/jpeg;base64,/9j/'
  // Exercise the rule with a payload larger than the old HTTPS limit.
  const uploadedImage = jpegPrefix + Buffer.alloc(90_000, 42).toString('base64')
  const uploadedProduct = await addDoc(products, { ...sample, image: uploadedImage })
  assert.equal((await getDocFromServer(uploadedProduct)).data().image, uploadedImage)
  await updateDoc(created, { image: uploadedImage })
  await waitForSnapshot((snapshot) => visibleIn(snapshot)?.data().image === uploadedImage)
  await assert.rejects(updateDoc(created, { image: jpegPrefix + 'a'.repeat(180_000) }), permissionDenied)
  await assert.rejects(updateDoc(created, { image: 'data:image/svg+xml;base64,AAAA' }), permissionDenied)
  await deleteDoc(uploadedProduct)
  console.log('PASS Uploaded product images can be created and replaced within the JPEG size limit')
  await deleteDoc(created)
  await waitForSnapshot((snapshot) => !visibleIn(snapshot))
  await signOut(admin.auth)
  assert.equal(admin.auth.currentUser, null)
  console.log('PASS Admin create, edit and delete reached an unauthenticated real-time listener')
} finally {
  unsubscribe?.()
  await snapshots?.return()
  await Promise.all(apps.map(deleteApp))
}
