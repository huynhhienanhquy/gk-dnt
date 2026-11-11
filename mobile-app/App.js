import { useEffect, useState } from 'react'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { launchImageLibraryAsync } from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import { signOut } from 'firebase/auth'
import { ActivityIndicator, BackHandler, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import UserAvatar from './components/UserAvatar.js'
import { useAdminSession } from './contexts/useAdminSession.js'
import { useLogin } from './contexts/useLogin.js'
import { auth, configError } from './firebase/client.js'
import { maxImageLength, removeProduct, saveProduct, subscribeToProducts, productFields, validateProduct } from './services/products.js'

const loadingList = { products: [], fromCache: false, status: 'loading' }

function normalizeSearch(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd')
}

function Action({ children, onPress, disabled = false, danger = false, primary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.primaryButton, pressed && (primary ? styles.primaryPressed : styles.pressed), danger && styles.dangerButton, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryText, danger && styles.dangerText]}>{children}</Text>
    </Pressable>
  )
}

function Brand() {
  return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLetter}>u·</Text></View><View><Text style={styles.brandName}>userly</Text><Text style={styles.brandTagline}>QUẢN LÝ SẢN PHẨM</Text></View></View>
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

function Field({ label, secureTextEntry, ...props }) {
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputFrame, focused && styles.inputFocused]}>
        <TextInput
          placeholderTextColor="#8a9b95" style={styles.fieldInput} accessibilityLabel={label}
          autoCapitalize="none" secureTextEntry={secureTextEntry && !revealed}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props}
        />
        {secureTextEntry && <Pressable accessibilityRole="button" accessibilityLabel={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setRevealed((value) => !value)} style={styles.revealButton}><Text style={styles.revealText}>{revealed ? 'Ẩn' : 'Hiện'}</Text></Pressable>}
      </View>
    </View>
  )
}

function Login() {
  const { email, setEmail, password, setPassword, busy, error, login } = useLogin()

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.login}>
      <Brand />
      <View style={styles.loginHero}>
        <View style={styles.heroOrb} accessible={false} />
        <Text style={styles.heroEyebrow}>KHÔNG GIAN CỦA BẠN</Text>
        <Text style={styles.heroTitle} accessibilityRole="header">Quản lý sản phẩm</Text>
        <Text style={styles.heroDescription}>Danh mục đồng bộ trên web và ứng dụng.</Text>
        <View style={styles.heroPill}><Text style={styles.heroPillText}>↔  Web & ứng dụng</Text></View>
      </View>
      <View style={styles.notice}>
        <View style={styles.field}><Text style={styles.sectionTitle} accessibilityRole="header">Chào mừng trở lại</Text><Text style={styles.muted}>Đăng nhập để tiếp tục vào không gian của bạn.</Text></View>
        <Field label="Email quản trị" placeholder="admin@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="username" editable={!busy} />
        <Field label="Mật khẩu" placeholder="Nhập mật khẩu của bạn" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy} onSubmitEditing={login} />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <Action primary onPress={login} disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập  →'}</Action>
      </View>
      <Text style={styles.loginFootnote}>Dành cho tài khoản đã được cấp quyền quản trị.</Text>
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

function ProductForm({ product, busy, error, fromCache, onSave, onCancel }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    productFields.map(({ name }) => [name, String(product?.[name] ?? '')]),
  ))
  const [image, setImage] = useState(product?.image ?? '')
  const [readingImage, setReadingImage] = useState(false)
  const [imageError, setImageError] = useState('')

  async function pickImage() {
    setReadingImage(true)
    try {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'] })
      if (result.canceled) return
      setImageError('')
      const { uri, width, height } = result.assets[0]
      const context = ImageManipulator.manipulate(uri)
      try {
        if (Math.max(width, height) > 384) {
          context.resize(width >= height ? { width: 384 } : { height: 384 })
        }
        const rendered = await context.renderAsync()
        try {
          const { base64 } = await rendered.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG })
          const avatar = `data:image/jpeg;base64,${base64}`
          if (!base64 || avatar.length > maxImageLength) throw new Error('Could not encode avatar')
          setImage(avatar)
        } finally {
          rendered.release()
        }
      } finally {
        context.release()
      }
    } catch {
      setImageError('Không xử lý được ảnh. Hãy chọn ảnh khác.')
    } finally {
      setReadingImage(false)
    }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Action onPress={onCancel} disabled={busy}>‹ Quay lại</Action>
      <Text style={styles.title} accessibilityRole="header">{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
      <View style={styles.notice}>
        <View style={styles.avatarPicker}>
          <View style={styles.avatarRing}><UserAvatar key={image} name={values.name} uri={image} size={80} /></View>
          <Text style={styles.fieldLabel}>Ảnh sản phẩm</Text>
          <Action onPress={pickImage} disabled={busy || readingImage}>{readingImage ? 'Đang xử lý ảnh…' : image ? 'Đổi ảnh sản phẩm' : 'Chọn ảnh sản phẩm'}</Action>
        </View>
        <Text style={styles.formSection}>THÔNG TIN SẢN PHẨM</Text>
        {productFields.map(({ name, label, type, maxLength }) => (
          <Field
            key={name}
            label={label}
            value={values[name]}
            onChangeText={(value) => setValues((current) => ({ ...current, [name]: value }))}
            keyboardType={name === 'price' ? 'decimal-pad' : type === 'number' ? 'number-pad' : 'default'}
            autoCapitalize={name === 'name' ? 'words' : 'none'}
            maxLength={maxLength}
            editable={!busy}
            placeholder={name === 'name' ? 'Nhập tên sản phẩm' : '0'}
          />
        ))}
        {fromCache && <Text style={styles.connection}>Đang kết nối lại Firestore.</Text>}
        {imageError ? <Text style={styles.error} accessibilityRole="alert">{imageError}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.formActions}>
          <Action primary onPress={() => onSave({ ...values, image })} disabled={busy || fromCache || readingImage || Boolean(imageError)}>{busy ? 'Đang lưu…' : 'Lưu thông tin  →'}</Action>
          <Action onPress={onCancel} disabled={busy}>Hủy</Action>
        </View>
      </View>
    </ScrollView>
  )
}

function ProductDetail({ product, fromCache, busy, error, onEdit, onDelete, onBack }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Action onPress={onBack} disabled={busy}>‹ Danh sách</Action>
      {product ? (
        <View style={styles.profile}>
          <View style={styles.profileCover}><Text style={styles.heroEyebrow}>CHI TIẾT SẢN PHẨM</Text></View>
          <View style={styles.profileAvatar}><UserAvatar key={product.image} name={product.name} uri={product.image} size={96} /></View>
          <Text accessibilityRole="header" style={styles.profileName}>{product.name || 'Chưa có tên'}</Text>
          <Text style={styles.profileEmail}>Giá: {product.price.toLocaleString('vi-VN')}</Text>
          <Text style={styles.profileEmail}>Số lượng: {product.soluong.toLocaleString('vi-VN')}</Text>
          <View style={styles.profileDivider} />
          {confirm ? (
            <View style={styles.field}>
              <Text style={styles.muted}>Xóa sản phẩm này khỏi danh sách?</Text>
              <View style={styles.actions}>
                <Action onPress={onDelete} disabled={busy || fromCache} danger>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</Action>
                <Action onPress={() => setConfirm(false)} disabled={busy}>Hủy</Action>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Action primary onPress={onEdit} disabled={fromCache}>Sửa sản phẩm</Action>
              <Action onPress={() => setConfirm(true)} disabled={fromCache} danger>Xóa</Action>
            </View>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>
      ) : (
        <Notice title="Sản phẩm không còn trong danh sách" description="Quay lại danh sách để xem dữ liệu hiện tại." />
      )}
      {fromCache && <Text style={styles.connection} accessibilityLiveRegion="polite">Đang hiển thị dữ liệu tạm trong khi kết nối Firestore.</Text>}
    </ScrollView>
  )
}

function ProductCatalog({ email }) {
  const [list, setList] = useState(loadingList)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const product = list.products.find((entry) => entry.id === selectedId)
  const query = normalizeSearch(search.trim())
  const visibleProducts = query ? list.products.filter(({ name }) => normalizeSearch(name).includes(query)) : list.products

  useEffect(() => {
    return subscribeToProducts(
      (products, fromCache) => setList({ products, fromCache, status: 'ready' }),
      () => setList({ products: [], fromCache: false, status: 'error' }),
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
    setEditor({ product: entry })
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
        data = validateProduct(values)
      } catch (failure) {
        setError(failure.message)
        return
      }
    }

    setBusy(true)
    try {
      if (data) {
        await saveProduct(editor.product?.id, data)
        setMessage(editor.product ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.')
        setEditor(null)
      } else {
        setDeleting(product)
        await removeProduct(selectedId)
        setMessage('Đã xóa sản phẩm.')
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
        <View style={styles.account}><Brand /><Logout /></View>
        <Text style={styles.accountEmail} numberOfLines={1}>{email}</Text>

      </View>
      {editor && list.status === 'ready' && (
        <ProductForm
          product={editor.product}
          busy={busy}
          error={error}
          fromCache={list.fromCache}
          onSave={mutate}
          onCancel={closeEditor}
        />
      )}
      {!editor && selectedId && list.status === 'ready' && (
        <ProductDetail
          product={product ?? deleting}
          fromCache={list.fromCache}
          busy={busy}
          error={error}
          onEdit={() => openEditor(product)}
          onDelete={() => mutate()}
          onBack={closeDetail}
        />
      )}
      {list.status === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color="#087f6b" />
          <Text style={styles.muted} accessibilityLiveRegion="polite">Đang tải danh sách…</Text>
        </View>
      )}
      {list.status === 'error' && (
        <View style={styles.content}><Notice title="Không tải được danh sách" description="Kiểm tra mạng và quyền đọc Firestore rồi thử lại." retry={retry} /></View>
      )}
      {list.status === 'ready' && !editor && !selectedId && (
        <FlatList
          data={visibleProducts}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(product) => product.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={(
            <View style={styles.listIntro}>
              <View style={styles.directoryHero}>
                <View style={styles.heroOrb} accessible={false} />
                <Text style={styles.heroEyebrow}>DANH MỤC</Text>
                <Text style={styles.heroTitle} accessibilityRole="header">Sản phẩm</Text>
                <View style={styles.heroBottom}>
                  <View><Text style={styles.heroCount}>{list.products.length}</Text><Text style={styles.heroDescription}>sản phẩm trong danh mục</Text></View>
                  <View style={styles.heroSymbol} accessible={false}><Text style={styles.heroSymbolText}>↗</Text></View>
                </View>
              </View>
              <Action primary onPress={() => openEditor()} disabled={list.fromCache}>＋ Thêm sản phẩm</Action>
              <View style={styles.directorySummary}><Text style={styles.sectionTitle}>Sản phẩm</Text><Text style={styles.countBadge}>{list.products.length} sản phẩm</Text></View>
              <View style={styles.searchBox}>
                <Text style={styles.searchGlyph} accessible={false}>⌕</Text>
                <TextInput accessibilityLabel="Tìm theo tên sản phẩm" autoCapitalize="none" autoCorrect={false} placeholder="Tìm tên sản phẩm…" placeholderTextColor="#8a9b95" returnKeyType="search" style={styles.searchInput} value={search} onChangeText={setSearch} />
                {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setSearch('')} style={styles.clearSearch}><Text style={styles.revealText}>×</Text></Pressable>}
              </View>
              {query ? <Text style={styles.muted} accessibilityLiveRegion="polite">{visibleProducts.length} kết quả tìm kiếm</Text> : null}
              {message ? <Text style={styles.success} accessibilityLiveRegion="polite">{message}</Text> : null}
              {list.fromCache && <Text style={styles.connection} accessibilityLiveRegion="polite">Đang kết nối lại Firestore. Dữ liệu có thể chưa cập nhật.</Text>}
            </View>
          )}
          ListEmptyComponent={list.products.length === 0 && list.fromCache ? (
            <Notice title="Chưa có dữ liệu tạm" description="Danh sách sẽ cập nhật khi kết nối được với Firestore." />
          ) : (
            <Notice title={list.products.length === 0 ? 'Danh sách trống' : 'Không tìm thấy sản phẩm phù hợp'} />
          )}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMessage('')
                setSelectedId(item.id)
              }}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <UserAvatar key={item.image} name={item.name} uri={item.image} size={48} />
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name || 'Chưa có tên'}</Text>
                <Text style={styles.cardEmail} numberOfLines={1}>{item.price.toLocaleString('vi-VN')} · SL: {item.soluong.toLocaleString('vi-VN')}</Text>
              </View>
              <View style={styles.chevronCircle}><Text style={styles.chevron} accessible={false}>›</Text></View>
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
  if (status === 'admin') return <ProductCatalog key={user.uid} email={user.email} />
  if (status === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#087f6b" />
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
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><AdminApp /></KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { color: '#18332f', fontSize: 21, fontWeight: '700', letterSpacing: -0.6 },
  loginHero: { padding: 26, gap: 16, backgroundColor: '#075d50', borderRadius: 28, overflow: 'hidden' },
  directoryHero: { padding: 26, gap: 16, backgroundColor: '#075d50', borderRadius: 26, overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 36, borderColor: '#ffffff08', top: -65, right: -85 },
  heroEyebrow: { color: '#b4e0cf', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '700', letterSpacing: -0.9, lineHeight: 38 },
  heroDescription: { color: '#c1e1d6', fontSize: 13, lineHeight: 21 },
  heroPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff12', borderRadius: 20, borderWidth: 1, borderColor: '#ffffff20' },
  heroPillText: { color: '#e1f3ec', fontSize: 11, fontWeight: '600' },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#ffffff20', paddingTop: 16 },
  heroCount: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  heroSymbol: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff12', alignItems: 'center', justifyContent: 'center' },
  heroSymbolText: { fontSize: 26, color: '#b4e0cf' },
  listContent: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
  listIntro: { gap: 16, paddingBottom: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingLeft: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e1e9e6' },
  searchGlyph: { color: '#647873', fontSize: 26 },
  searchInput: { flex: 1, minWidth: 0, color: '#18332f', fontSize: 15, paddingVertical: 14, paddingRight: 12 },
  clearSearch: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cardEmail: { color: '#647873', fontSize: 13, lineHeight: 20 },
  chevronCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f6f3', alignItems: 'center', justifyContent: 'center' },
  inputFrame: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#e1e9e6', backgroundColor: '#f8fbf9' },
  inputFocused: { borderColor: '#087f6b', backgroundColor: '#fff' },
  fieldInput: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, color: '#18332f', fontSize: 16 },
  revealButton: { minHeight: 48, minWidth: 52, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  revealText: { color: '#087f6b', fontSize: 13, fontWeight: '600' },
  avatarPicker: { alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatarRing: { padding: 6, backgroundColor: '#f0f7f3', borderWidth: 1, borderColor: '#daebe1', borderRadius: 50 },
  formSection: { color: '#647873', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  formActions: { gap: 12 },
  profileCover: { alignSelf: 'stretch', marginHorizontal: -22, height: 112, backgroundColor: '#075d50', padding: 24 },
  profileAvatar: { marginTop: -54, padding: 6, borderRadius: 58, backgroundColor: '#fff' },
  profileDivider: { height: 1, backgroundColor: '#e6eeea', alignSelf: 'stretch', marginVertical: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 40, height: 40, backgroundColor: '#087f6b', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#fff', fontSize: 31, fontWeight: '800', marginTop: -4, letterSpacing: -3 },
  brandName: { color: '#18332f', fontSize: 25, fontWeight: '700', letterSpacing: -1 },
  brandTagline: { color: '#647873', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  loginFootnote: { color: '#647873', fontSize: 12, textAlign: 'center', lineHeight: 19 },
  accountEmail: { color: '#647873', fontSize: 11, paddingLeft: 50 },
  directorySummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 },
  countBadge: { color: '#087f6b', backgroundColor: '#e8f5ef', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 11, fontWeight: '600' },
  primaryButton: { backgroundColor: '#087f6b', alignSelf: 'stretch', alignItems: 'center' },
  primaryText: { color: '#fff' },
  primaryPressed: { backgroundColor: '#066653' },
  dangerText: { color: '#a13643' },
  screen: { flex: 1, backgroundColor: '#f5f8f7' },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, gap: 2, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e6eeea' },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  login: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 32, gap: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  account: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 8 },
  fieldLabel: { color: '#18332f', fontWeight: '700' },
  error: { color: '#a13643', backgroundColor: '#fff0f1', padding: 12, borderRadius: 10, lineHeight: 21 },
  success: { color: '#087451', backgroundColor: '#e8f5ef', padding: 12, borderRadius: 10, fontWeight: '600' },
  title: { color: '#18332f', fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  muted: { color: '#647873', fontSize: 15, lineHeight: 21 },
  loading: { alignItems: 'center', gap: 12, paddingTop: 36 },
  connection: { color: '#69410a', backgroundColor: '#fff1cf', padding: 12, borderRadius: 12, lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 90,
    backgroundColor: '#fff', borderColor: '#e6eeea', borderWidth: 1, borderRadius: 20, padding: 16,
    shadowColor: '#18332f', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.035, shadowRadius: 10, elevation: 1,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 5 },
  cardName: { color: '#18332f', fontWeight: '700', fontSize: 16 },
  chevron: { color: '#087f6b', fontSize: 25 },
  notice: { backgroundColor: '#fff', borderColor: '#e1e9e6', borderWidth: 1, borderRadius: 24, padding: 22, gap: 22 },
  noticeTitle: { color: '#18332f', fontWeight: '700', fontSize: 18 },
  button: { alignSelf: 'flex-start', backgroundColor: '#e8f5ef', borderRadius: 14, minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: '#087f6b', fontWeight: '700', fontSize: 15 },
  pressed: { backgroundColor: '#d4ebdf' },
  dangerButton: { backgroundColor: '#fde8eb' },
  disabled: { opacity: 0.55 },
  profile: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e1e9e6', borderWidth: 1, borderRadius: 24, paddingHorizontal: 22, paddingBottom: 28, gap: 16, overflow: 'hidden' },
  profileName: { color: '#18332f', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  profileEmail: { color: '#647873', fontSize: 16, textAlign: 'center' },
})
