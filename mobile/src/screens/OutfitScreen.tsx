import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Screen, Title } from '../components/ui'
import { OUTFITS } from '../data/shop'
import type { FloorParamList } from '../navigation/types'
import { holdGarment } from './CreateFlow'
import { tokens } from '../theme/tokens'

export function OutfitScreen({ navigation }: NativeStackScreenProps<FloorParamList, 'Outfit'>) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState('')
  const shown = OUTFITS.filter(item => item.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <Screen>
      <Title>Create order</Title>
      <Text style={styles.label}>Select outfit type</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search"
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.search}
      />
      <View style={styles.grid}>
        {shown.map(item => (
          <Pressable key={item} onPress={() => setPicked(item)} style={[styles.tile, picked === item ? styles.tileOn : null]}>
            <Text style={styles.tileText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Button label="Next" disabled={!picked} onPress={() => { holdGarment(picked); navigation.navigate('OrderForm') }} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: { color: tokens.color.inkSoft, fontWeight: '700' },
  search: {
    backgroundColor: '#fff',
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: tokens.color.ink,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '31%',
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.color.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tileOn: { borderColor: tokens.color.brass, borderWidth: 2 },
  tileText: { textAlign: 'center', color: tokens.color.ink },
})
