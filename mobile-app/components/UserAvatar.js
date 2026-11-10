import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

export default function UserAvatar({ name, uri, size }) {
  const [failed, setFailed] = useState(false)
  const dimensions = { width: size, height: size, borderRadius: size / 2 }

  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.avatar, dimensions]} onError={() => setFailed(true)} />
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <View style={[styles.avatar, styles.placeholder, dimensions]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: '#e5edff' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#244cc4', fontWeight: '700' },
})
