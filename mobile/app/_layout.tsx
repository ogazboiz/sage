import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import 'react-native-reanimated'
import { AppProviders } from '@/components/app-providers'
import { colors } from '@/constants/app-styles'

// Android: set the root window background so there's no black flash behind
// the transparent navigation bar before React Native paints.
SystemUI.setBackgroundColorAsync(colors.bg)

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg)
  }, [])

  return (
    <AppProviders>
      {/*
        style="dark"  → dark-coloured status bar icons (for light backgrounds)
        backgroundColor → explicit colour on Android (ignored on iOS where the
        bar is always transparent). Removing translucent keeps the status bar
        in its own space so there's no transparent-over-black flash.
      */}
      <StatusBar style="dark" backgroundColor="#fafaf7" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProviders>
  )
}
