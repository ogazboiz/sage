import { Redirect } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { OnboardingHero } from '@/components/onboarding-hero'

// Root entry point — mirrors the web flow:
//   - No wallet connected → show OnboardingHero (no tabs, no nav)
//   - Wallet connected   → drop the user onto the Talk tab with the full
//                          4-tab nav available
export default function Index() {
  const { account } = useMobileWallet()

  if (!account) {
    return <OnboardingHero />
  }

  return <Redirect href={'/(tabs)/talk' as never} />
}
