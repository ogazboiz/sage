import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Account, useMobileWallet } from '@wallet-ui/react-native-kit'
import { appStyles, colors } from '@/constants/app-styles'

type Status = 'idle' | 'pending' | 'done' | 'failed'

export function AccountFeatureSignIn({ account }: { account?: Account }) {
  const { chain, identity, signIn } = useMobileWallet()
  const [status, setStatus] = useState<Status>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function scheduleReset() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 2500)
  }

  async function submit() {
    setStatus('pending')
    try {
      await signIn({ address: account?.address.toString(), chainId: chain, uri: identity.uri })
      setStatus('done')
    } catch {
      setStatus('failed')
    }
    scheduleReset()
  }

  const label: Record<Status, string> = {
    idle: account ? 'Sign In with Solana' : 'Sign In & Connect',
    pending: 'Awaiting approval…',
    done: '✓ Signed in',
    failed: '✕ Failed — try again',
  }

  const statusColor =
    status === 'done' ? colors.green : status === 'failed' ? colors.error : undefined

  if (account) {
    return (
      <TouchableOpacity
        style={[styles.row, status === 'pending' && { opacity: 0.5 }]}
        onPress={submit}
        disabled={status === 'pending'}
        activeOpacity={0.6}
      >
        <Text style={[styles.rowLabel, statusColor ? { color: statusColor } : null]}>
          {label[status]}
        </Text>
        {status === 'idle' && <Text style={styles.chevron}>›</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      style={[
        appStyles.btnOutline,
        status === 'pending' && { opacity: 0.5 },
        statusColor ? { borderColor: statusColor } : null,
      ]}
      onPress={submit}
      disabled={status === 'pending'}
      activeOpacity={0.8}
    >
      <Text style={[appStyles.btnOutlineText, statusColor ? { color: statusColor } : null]}>
        {label[status]}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
    lineHeight: 22,
  },
})
