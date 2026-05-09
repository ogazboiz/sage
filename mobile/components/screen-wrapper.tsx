import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles, colors } from '@/constants/app-styles'
import type { PropsWithChildren } from 'react'

interface ScreenWrapperProps extends PropsWithChildren {
  title: string
  right?: React.ReactNode
}

export function ScreenWrapper({ children, title, right }: ScreenWrapperProps) {
  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={appStyles.headerTitle}>{title}</Text>
        {right ?? null}
      </View>
      {children}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
})
