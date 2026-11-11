import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

const avatarColors = [
  { backgroundColor: '#e8f5ef', color: '#087f6b' },
  { backgroundColor: '#eef0fc', color: '#5964a0' },
  { backgroundColor: '#fbefdf', color: '#97652f' },
  { backgroundColor: '#f9eaf0', color: '#a25476' },
]

export default function UserAvatar({ name, uri, size }) {
  const [failed, setFailed] = useState(false)
  const dimensions = { width: size, height: size, borderRadius: size / 2 }

  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.avatar, dimensions]} onError={() => setFailed(true)} />
  }

  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const initial = words.slice(-2).map((word) => word.charAt(0)).join('').toUpperCase() || '?'
  const colorIndex = Array.from(name ?? '').reduce((sum, character) => sum + character.codePointAt(0), 0) % avatarColors.length
  const { backgroundColor, color } = avatarColors[colorIndex]
  return (
    <View style={[styles.avatar, styles.placeholder, dimensions, { backgroundColor }]}>
      <Text style={[styles.initial, { color, fontSize: size * (initial.length > 1 ? 0.3 : 0.4) }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: '#e8f5ef' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#087f6b', fontWeight: '700' },
})
