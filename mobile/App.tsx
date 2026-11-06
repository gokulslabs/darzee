import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { RootTabs } from './src/navigation/RootTabs'
import { SessionProvider, useSession } from './src/state/Session'
import { ShopProvider } from './src/state/ShopContext'
import { palettes } from './src/theme/tokens'

function ThemedApp() {
  const { theme } = useSession()
  const color = palettes[theme]
  const navigationTheme = {
    ...DefaultTheme,
    dark: theme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: color.paper,
      card: color.paperRaised,
      text: color.ink,
      border: color.line,
      primary: color.brass,
      notification: color.brass,
    },
  }
  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <RootTabs />
      </NavigationContainer>
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ShopProvider>
        <SessionProvider>
          <ThemedApp />
        </SessionProvider>
      </ShopProvider>
    </SafeAreaProvider>
  )
}
