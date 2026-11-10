import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import UserAvatar from './components/UserAvatar.js'
import { configError } from './firebase/client.js'
import { subscribeToUsers } from './services/users.js'

const loadingList = { users: [], fromCache: false, status: 'loading' }

function Action({ children, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{children}</Text>
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

function UserDetail({ user, fromCache, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.backRow}><Action onPress={onBack}>‹ Danh sách</Action></View>
      {user ? (
        <View style={styles.profile}>
          <UserAvatar key={user.hinhanh} name={user.hoten} uri={user.hinhanh} size={112} />
          <Text accessibilityRole="header" style={styles.profileName}>{user.hoten || 'Chưa có họ tên'}</Text>
          <Text selectable style={styles.profileEmail}>{user.email || 'Chưa có email'}</Text>
        </View>
      ) : (
        <Notice title="Người dùng không còn trong danh sách" description="Quay lại danh sách để xem dữ liệu hiện tại." />
      )}
      {fromCache && <Text style={styles.connection} accessibilityLiveRegion="polite">Đang hiển thị dữ liệu tạm trong khi kết nối Firestore.</Text>}
    </ScrollView>
  )
}

function Directory() {
  const [list, setList] = useState(loadingList)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (configError) return
    return subscribeToUsers(
      (users, fromCache) => setList({ users, fromCache, status: 'ready' }),
      () => setList({ users: [], fromCache: false, status: 'error' }),
    )
  }, [attempt])

  useEffect(() => {
    if (!selectedId) return
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null)
      return true
    })
    return () => back.remove()
  }, [selectedId])

  function retry() {
    setList(loadingList)
    setAttempt((current) => current + 1)
  }

  if (configError) {
    return <View style={styles.content}><Notice title="Cấu hình Firebase" description={configError} /></View>
  }

  if (selectedId && list.status === 'ready') {
    const user = list.users.find((entry) => entry.id === selectedId)
    return <UserDetail user={user} fromCache={list.fromCache} onBack={() => setSelectedId(null)} />
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DANH BẠ DEMO</Text>
        <Text style={styles.title} accessibilityRole="header">Người dùng</Text>
        <Text style={styles.muted}>Chọn một người để xem thông tin.</Text>
      </View>
      {list.status === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color="#244cc4" />
          <Text style={styles.muted} accessibilityLiveRegion="polite">Đang tải danh sách…</Text>
        </View>
      )}
      {list.status === 'error' && (
        <View style={styles.content}><Notice title="Không tải được danh sách" description="Kiểm tra mạng và quyền đọc Firestore rồi thử lại." retry={retry} /></View>
      )}
      {list.status === 'ready' && (
        <FlatList
          data={list.users}
          keyExtractor={(user) => user.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={list.fromCache
            ? <Text style={styles.connection} accessibilityLiveRegion="polite">Đang kết nối lại Firestore. Dữ liệu có thể chưa cập nhật.</Text>
            : null}
          ListEmptyComponent={list.fromCache
            ? <Notice title="Chưa có dữ liệu tạm" description="Danh sách sẽ cập nhật khi kết nối được với Firestore." />
            : <Notice title="Danh sách trống" description="Người dùng mới từ Web Admin sẽ xuất hiện ở đây." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedId(item.id)}
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

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <Directory />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f6fc' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 5 },
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  eyebrow: { color: '#244cc4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
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
  backRow: { alignItems: 'flex-start' },
  button: { alignSelf: 'flex-start', backgroundColor: '#e7edff', borderRadius: 10, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: '#244cc4', fontWeight: '700', fontSize: 15 },
  pressed: { backgroundColor: '#dce7ff' },
  profile: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#d6e0ef', borderWidth: 1, borderRadius: 18, padding: 24, gap: 10 },
  profileName: { color: '#17243c', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  profileEmail: { color: '#52637c', fontSize: 16, textAlign: 'center' },
})
