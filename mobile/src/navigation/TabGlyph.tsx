import { StyleSheet, View } from 'react-native'

type GlyphName = 'Home' | 'Orders' | 'Customers' | 'Dashboard' | 'Settings'

export function TabGlyph({ name, color, size = 22 }: { name: GlyphName; color: string; size?: number }) {
  if (name === 'Home') return <Home color={color} size={size} />
  if (name === 'Orders') return <Orders color={color} size={size} />
  if (name === 'Customers') return <Customers color={color} size={size} />
  if (name === 'Dashboard') return <Dashboard color={color} size={size} />
  return <Settings color={color} size={size} />
}

function Home({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.38,
          borderRightWidth: size * 0.38,
          borderBottomWidth: size * 0.3,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View style={{ width: size * 0.5, height: size * 0.36, marginTop: -1, backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
    </View>
  )
}

function Orders({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View style={{ width: size * 0.58, height: size * 0.74, borderRadius: 3, borderWidth: 1.7, borderColor: color, alignItems: 'center' }}>
        <View style={{ width: size * 0.26, height: size * 0.1, marginTop: -size * 0.05, borderRadius: 2, backgroundColor: color }} />
        <View style={[styles.line, { width: size * 0.32, backgroundColor: color, marginTop: 4 }]} />
        <View style={[styles.line, { width: size * 0.32, backgroundColor: color, marginTop: 3 }]} />
        <View style={[styles.line, { width: size * 0.24, backgroundColor: color, marginTop: 3 }]} />
      </View>
    </View>
  )
}

function Customers({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.box, { width: size, height: size, justifyContent: 'flex-end' }]}>
      <View style={{ width: size * 0.32, height: size * 0.32, borderRadius: size, backgroundColor: color }} />
      <View style={{ width: size * 0.62, height: size * 0.26, marginTop: 2, borderTopLeftRadius: size, borderTopRightRadius: size, backgroundColor: color }} />
    </View>
  )
}

function Dashboard({ color, size }: { color: string; size: number }) {
  const bars = [0.38, 0.62, 0.48, 0.78]
  return (
    <View style={[styles.box, { width: size, height: size, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }]}>
      {bars.map(height => (
        <View key={height} style={{ width: 3, height: size * height, borderRadius: 1, backgroundColor: color }} />
      ))}
    </View>
  )
}

function Settings({ color, size }: { color: string; size: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {[0, 45, 90, 135].map(deg => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: 2.4,
            height: size * 0.72,
            borderRadius: 1,
            backgroundColor: color,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
      <View style={{ width: size * 0.28, height: size * 0.28, borderRadius: size, backgroundColor: '#FFFFFF', zIndex: 1 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  line: { height: 1.6, borderRadius: 1 },
})
