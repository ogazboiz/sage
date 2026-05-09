import React from 'react'
import { Platform, View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/app-styles'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'talk',     title: 'Talk',     icon: 'mic-circle-outline',   iconFocused: 'mic-circle'     },
  { name: 'vault',    title: 'Vault',    icon: 'shield-outline',        iconFocused: 'shield'         },
  { name: 'activity', title: 'Activity', icon: 'stats-chart-outline',   iconFocused: 'stats-chart'    },
]

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = 62 + insets.bottom

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 10,
          paddingBottom: insets.bottom + 8,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          marginTop: Platform.OS === 'android' ? 2 : 1,
          fontFamily: 'monospace',
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      {TABS.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: 'center' }}>
                {/* Accent indicator dot above icon */}
                {focused && (
                  <View style={{
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: colors.accent,
                    marginBottom: 3,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  }} />
                )}
                <Ionicons name={focused ? iconFocused : icon} size={22} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
