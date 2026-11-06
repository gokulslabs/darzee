import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { tokens, palettes } from '../theme/tokens'
import { useSession } from '../state/Session'
import { useShop } from '../state/ShopContext'

export function Screen({ children }: { children: ReactNode }) {
  const { ready, source, loadError } = useShop()
  const { theme } = useSession()
  const color = palettes[theme]
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: color.paper }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      {ready && source === 'local' ? (
        <Text style={styles.banner}>The stitching floor is offline. Showing the copy kept on this device.</Text>
      ) : null}
      {ready ? children : <Text style={styles.kicker}>Opening the floor…</Text>}
    </ScrollView>
  )
}

export function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>
}

export function Title({ children }: { children: string }) {
  const { theme } = useSession()
  return <Text style={[styles.title, { color: palettes[theme].ink }]}>{children}</Text>
}

export function Muted({ children }: { children: string }) {
  const { theme } = useSession()
  return <Text style={[styles.muted, { color: palettes[theme].inkSoft }]}>{children}</Text>
}

export function Card({ children }: { children: ReactNode }) {
  const { theme } = useSession()
  const color = palettes[theme]
  return <View style={[styles.card, { backgroundColor: color.paperRaised, borderColor: color.line }]}>{children}</View>
}

export function Button({
  label,
  onPress,
  disabled,
  quiet,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  quiet?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[quiet ? styles.quiet : styles.button, disabled ? styles.disabled : null]}
    >
      <Text style={quiet ? styles.quietText : styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

export function Field({
  label,
  value,
  onChangeText,
  keyboard,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  keyboard?: 'default' | 'decimal-pad' | 'phone-pad' | 'number-pad'
  multiline?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        placeholderTextColor={tokens.color.inkFaint}
        style={[styles.input, multiline ? styles.multiline : null]}
      />
    </View>
  )
}

export function Pill({ label }: { label: string }) {
  return <Text style={styles.pill}>{label}</Text>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.paper },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  kicker: {
    color: tokens.color.brass,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: tokens.font.sans,
  },
  title: {
    fontFamily: tokens.font.serif,
    fontSize: 36,
    color: tokens.color.ink,
  },
  muted: { color: tokens.color.inkSoft, fontFamily: tokens.font.sans },
  card: {
    backgroundColor: tokens.color.paperRaised,
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: 14,
    gap: 6,
  },
  button: {
    backgroundColor: tokens.color.ink,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: { color: tokens.color.paper, fontFamily: tokens.font.sans, fontWeight: '600' },
  quiet: {
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  quietText: { color: tokens.color.ink, fontFamily: tokens.font.sans },
  disabled: { opacity: 0.45 },
  field: { gap: 4 },
  label: { color: tokens.color.inkSoft, fontSize: 13, fontFamily: tokens.font.sans },
  input: {
    backgroundColor: tokens.color.paperRaised,
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: tokens.color.ink,
    fontFamily: tokens.font.sans,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  pill: {
    alignSelf: 'flex-start',
    borderColor: tokens.color.brassSoft,
    borderWidth: 1,
    borderRadius: 999,
    color: tokens.color.brass,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: tokens.font.sans,
  },
  banner: {
    backgroundColor: tokens.color.paperSunken,
    color: tokens.color.inkSoft,
    borderRadius: 12,
    padding: 10,
    fontFamily: tokens.font.sans,
  },
  error: { color: tokens.color.alert, fontFamily: tokens.font.sans },
})
