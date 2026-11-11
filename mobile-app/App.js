import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { signOut } from 'firebase/auth'
import { ActivityIndicator, BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import UserAvatar from './components/UserAvatar.js'
import { useAdminSession } from './contexts/useAdminSession.js'
import { useLogin } from './contexts/useLogin.js'
import { auth, configError } from './firebase/client.js'
import { removeUser, saveUser, subscribeToUsers, userFields, validateUser } from './services/users.js'

const loadingList = { users: [], fromCache: false, status: 'loading' }

function Action({ children, onPress, disabled = false, danger = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, danger && styles.dangerButton, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, danger && styles.error]}>{children}</Text>
    </Pressable>
  )
}

function Notice({ title, description, retry }) {
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeTitle}>{title}</Text>
      {description && <Text style={styles.muted}>{description}</Text>}
      {retry && <Action onPress={retry}>Thử lại</Action>}
    </View>
  )
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} accessibilityLabel={label} autoCapitalize="none" {...props} />
    </View>
  )
}

function Login() {
  const { email, setEmail, password, setPassword, busy, error, login } = useLogin()

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.login}>
      <View style={styles.notice}>
        <Text style={styles.title} accessibilityRole="header">Quản lý người dùng</Text>
        <Text style={styles.muted}>Đăng nhập bằng tài khoản quản trị Firebase.</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="username" editable={!busy} />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} onSubmitEditing={login} />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Action onPress={login} disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</Action>
      </View>
    </ScrollView>
  )
}

function Logout() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function logout() {
    setBusy(true)
    setError(false)
    try {
      await signOut(auth)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.field}>
      <Action onPress={logout} disabled={busy}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</Action>
      {error && <Text style={styles.error} accessibilityRole="alert">Đăng xuất thất bại. Hãy thử lại.</Text>}
    </View>
  )
}

function UserForm({ user, busy, error, fromCache, onSave, onCancel }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    userFields.map(({ name }) => [name, String(user?.[name] ?? '')]),
  ))

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">{user ? 'Sửa người dùng' : 'Thêm người dùng'}</Text>
      <View style={styles.notice}>
        {userFields.map(({ name, label, type, maxLength }) => (
          <Field
            key={name}
            label={label}
            value={values[name]}
            onChangeText={(value) => setValues((current) => ({ ...current, [name]: value }))}
            keyboardType={type === 'email' ? 'email-address' : type === 'url' ? 'url' : 'default'}
            autoCapitalize={name === 'hoten' ? 'words' : 'none'}
            maxLength={maxLength}
            editable={!busy}
          />
        ))}
        <Text style={styles.muted}>Dùng email hư cấu, mật khẩu demo và URL ảnh HTTPS.</Text>
        {fromCache && <Text style={styles.connection}>Đang kết nối lại Firestore.</Text>}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.actions}>
          <Action onPress={() => onSave(values)} disabled={busy || fromCache}>{busy ? 'Đang lưu…' : 'Lưu'}</Action>
          <Action onPress={onCancel} disabled={busy}>Hủy</Action>
        </View>
      </View>
    </ScrollView>
  )
}

function UserDetail({ user, fromCache, busy, error, onEdit, onDelete, onBack }) {
  const [confirm, setConfirm] = useState(false)
  const [showDemoPassword, setShowDemoPassword] = useState(false)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Action onPress={onBack} disabled={busy}>‹ Danh sách</Action>
      {user ? (
        <View style={styles.profile}>
          <UserAvatar key={user.hinhanh} name={user.hoten} uri={user.hinhanh} size={112} />
          <Text accessibilityRole="header" style={styles.profileName}>{user.hoten || 'Chưa có họ tên'}</Text>
          <Text selectable style={styles.profileEmail}>{user.email || 'Chưa có email'}</Text>
          {user.matkhau ? (
            <>
              <Action onPress={() => setShowDemoPassword((visible) => !visible)}>
                {showDemoPassword ? 'Ẩn mật khẩu demo' : 'Hiện mật khẩu demo'}
              </Action>
              {showDemoPassword && <Text selectable style={styles.profileEmail}>{user.matkhau}</Text>}
            </>
          ) : (
            <Text style={styles.muted}>Chưa có mật khẩu demo</Text>
          )}
          {confirm ? (
            <View style={styles.field}>
              <Text style={styles.muted}>Xóa người dùng này khỏi danh sách?</Text>
              <View style={styles.actions}>
                <Action onPress={onDelete} disabled={busy || fromCache} danger>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</Action>
                <Action onPress={() => setConfirm(false)} disabled={busy}>Hủy</Action>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Action onPress={onEdit} disabled={fromCache}>Sửa</Action>
              <Action onPress={() => setConfirm(true)} disabled={fromCache} danger>Xóa</Action>
            </View>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>
      ) : (
        <Notice title="Người dùng không còn trong danh sách" description="Quay lại danh sách để xem dữ liệu hiện tại." />
      )}
      {fromCache && <Text style={styles.connection} accessibilityLiveRegion="polite">Đang hiển thị dữ liệu tạm trong khi kết nối Firestore.</Text>}
    </ScrollView>
  )
}

function Directory({ email }) {
  const [list, setList] = useState(loadingList)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const user = list.users.find((entry) => entry.id === selectedId)

  useEffect(() => {
    return subscribeToUsers(
      (users, fromCache) => setList({ users, fromCache, status: 'ready' }),
      () => setList({ users: [], fromCache: false, status: 'error' }),
    )
  }, [attempt])

  useEffect(() => {
    if (!selectedId && !editor) return
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) {
        setError('')
        if (editor) setEditor(null)
        else setSelectedId(null)
      }
      return true
    })
    return () => back.remove()
  }, [selectedId, editor, busy])

  function retry() {
    setList(loadingList)
    setAttempt((current) => current + 1)
  }

  function openEditor(entry = null) {
    setError('')
    setMessage('')
    setEditor({ user: entry })
  }

  function closeDetail() {
    setError('')
    setSelectedId(null)
  }

  function closeEditor() {
    setEditor(null)
    setError('')
  }

  async function mutate(values) {
    if (busy || list.fromCache || list.status !== 'ready') return
    setError('')
    let data
    if (values) {
      try {
        data = validateUser(values)
      } catch (failure) {
        setError(failure.message)
        return
      }
    }

    setBusy(true)
    try {
      if (data) {
        await saveUser(editor.user?.id, data)
        setMessage(editor.user ? 'Đã cập nhật người dùng.' : 'Đã thêm người dùng.')
        setEditor(null)
      } else {
        setDeleting(user)
        await removeUser(selectedId)
        setMessage('Đã xóa người dùng.')
      }
      setSelectedId(null)
    } catch (failure) {
      setError(failure.code === 'permission-denied'
        ? 'Firestore từ chối thao tác. Hãy kiểm tra quyền quản trị và dữ liệu.'
        : 'Thao tác thất bại. Hãy thử lại.')
    } finally {
      setDeleting(null)
      setBusy(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.account}>
          <Text style={[styles.muted, styles.cardBody]} numberOfLines={1}>{email}</Text>
          <Logout />
        </View>
        <Text style={styles.title} accessibilityRole="header">Người dùng</Text>
        {!editor && !selectedId && (
          <Action onPress={() => openEditor()} disabled={list.status !== 'ready' || list.fromCache}>Thêm người dùng</Action>
        )}
      </View>
      {editor && list.status === 'ready' && (
        <UserForm
          user={editor.user}
          busy={busy}
          error={error}
          fromCache={list.fromCache}
          onSave={mutate}
          onCancel={closeEditor}
        />
      )}
      {!editor && selectedId && list.status === 'ready' && (
        <UserDetail
          user={user ?? deleting}
          fromCache={list.fromCache}
          busy={busy}
          error={error}
          onEdit={() => openEditor(user)}
          onDelete={() => mutate()}
          onBack={closeDetail}
        />
      )}
      {list.status === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color="#244cc4" />
          <Text style={styles.muted} accessibilityLiveRegion="polite">Đang tải danh sách…</Text>
        </View>
      )}
      {list.status === 'error' && (
        <View style={styles.content}><Notice title="Không tải được danh sách" description="Kiểm tra mạng và quyền đọc Firestore rồi thử lại." retry={retry} /></View>
      )}
      {list.status === 'ready' && !editor && !selectedId && (
        <FlatList
          data={list.users}
          keyExtractor={(user) => user.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={(message || list.fromCache) ? (
            <View style={styles.field}>
              {message ? <Text style={styles.success} accessibilityLiveRegion="polite">{message}</Text> : null}
              {list.fromCache && <Text style={styles.connection} accessibilityLiveRegion="polite">Đang kết nối lại Firestore. Dữ liệu có thể chưa cập nhật.</Text>}
            </View>
          ) : null}
          ListEmptyComponent={list.fromCache
            ? <Notice title="Chưa có dữ liệu tạm" description="Danh sách sẽ cập nhật khi kết nối được với Firestore." />
            : <Notice title="Danh sách trống" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMessage('')
                setSelectedId(item.id)
              }}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <UserAvatar key={item.hinhanh} name={item.hoten} uri={item.hinhanh} size={48} />
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.hoten || 'Chưa có họ tên'}</Text>
                <Text style={styles.muted}>{item.email || 'Chưa có email'}</Text>
              </View>
              <Text style={styles.chevron} accessible={false}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

function AdminApp() {
  const { status, user } = useAdminSession()
  if (configError) return <View style={styles.content}><Notice title="Cấu hình Firebase" description={configError} /></View>
  if (status === 'signed-out') return <Login />
  if (status === 'admin') return <Directory key={user.uid} email={user.email} />
  if (status === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#244cc4" />
        <Text style={styles.muted} accessibilityLiveRegion="polite">Đang kiểm tra phiên đăng nhập…</Text>
      </View>
    )
  }
  return (
    <View style={styles.content}>
      <Notice
        title={status === 'denied' ? 'Tài khoản chưa được cấp quyền' : 'Không xác minh được quyền quản trị'}
        description={status === 'denied' ? 'UID của tài khoản chưa có trong collection admins.' : 'Hãy kiểm tra mạng và đăng nhập lại.'}
      />
      <Logout />
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <AdminApp />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f6fc' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 5 },
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  login: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 5 },
  fieldLabel: { color: '#17243c', fontWeight: '700' },
  input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#aebdd2', color: '#17243c', backgroundColor: '#fff', fontSize: 16 },
  error: { color: '#a12836' },
  success: { color: '#176443', fontWeight: '700' },
  title: { color: '#17243c', fontSize: 32, fontWeight: '800' },
  muted: { color: '#52637c', fontSize: 15, lineHeight: 21 },
  loading: { alignItems: 'center', gap: 12, paddingTop: 36 },
  connection: { color: '#69410a', backgroundColor: '#fff1cf', padding: 12, borderRadius: 12, lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 78,
    backgroundColor: '#fff', borderColor: '#d6e0ef', borderWidth: 1, borderRadius: 16, padding: 12,
  },
  cardBody: { flex: 1, gap: 3 },
  cardName: { color: '#17243c', fontWeight: '700', fontSize: 16 },
  chevron: { color: '#244cc4', fontSize: 25 },
  notice: { backgroundColor: '#fff', borderColor: '#d6e0ef', borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  noticeTitle: { color: '#17243c', fontWeight: '700', fontSize: 18 },
  button: { alignSelf: 'flex-start', backgroundColor: '#e7edff', borderRadius: 10, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: '#244cc4', fontWeight: '700', fontSize: 15 },
  pressed: { backgroundColor: '#dce7ff' },
  dangerButton: { backgroundColor: '#fde8eb' },
  disabled: { opacity: 0.55 },
  profile: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#d6e0ef', borderWidth: 1, borderRadius: 18, padding: 24, gap: 10 },
  profileName: { color: '#17243c', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  profileEmail: { color: '#52637c', fontSize: 16, textAlign: 'center' },
})
