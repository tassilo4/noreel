import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

const CARDS = [
  { emoji: '🚫', title: 'No reels', body: 'Instagram without the brainrot. Your feed, your stories, your DMs. No reels tab, ever.' },
  { emoji: '✨', title: 'All the features you love', body: 'Stories, DMs, comments. Everything works exactly as you know it.' },
  { emoji: '🔒', title: 'Zero data collected', body: 'Noreel never sees your data. Everything stays between you and Instagram.' },
  { emoji: '🆓', title: '100% free', body: 'No subscriptions, no ads, no catch. Free forever.' },
];

export default function OnboardingScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const card = useColor('card');
  const cardForeground = useColor('cardForeground');
  const textMuted = useColor('textMuted');

  async function handleGetStarted() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: top + 48,
          paddingBottom: bottom + 32,
          paddingHorizontal: 24,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 12 }}>
          <Text variant='title' style={{ marginBottom: 8 }}>Welcome to Noreel</Text>
          <Text variant='body' style={{ opacity: 0.55 }}>Use Instagram with peace of mind.</Text>
        </View>

        {CARDS.map((card_item) => (
          <View
            key={card_item.title}
            style={{
              borderRadius: 20,
              backgroundColor: card,
              paddingHorizontal: 20,
              paddingVertical: 18,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>{card_item.emoji}</Text>
              <Text style={{ fontWeight: '500', fontSize: 16, color: cardForeground }}>{card_item.title}</Text>
            </View>
            <Text style={{ fontSize: 14, color: cardForeground, opacity: 0.6, lineHeight: 20 }}>
              {card_item.body}
            </Text>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <Button size='lg' onPress={handleGetStarted}>
            Get started
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
