import { Platform, useColorScheme } from 'react-native';
import { useColor } from '@/hooks/useColor';
import MaterialIcons from '@expo/vector-icons/Feather';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { SettingsProvider } from '@/providers/settings-context';

export default function TabsLayout() {
  const primary = useColor('primary');
  const foreground = useColor('foreground');
  const colorScheme = useColorScheme();

  return (
    <SettingsProvider>
    <NativeTabs
      key={colorScheme}
      lazy={false}
      minimizeBehavior='onScrollDown'
      labelStyle={{
        default: { color: primary },
        selected: { color: foreground },
      }}
      iconColor={{
        default: primary,
        selected: foreground,
      }}
      labelVisibilityMode='labeled'
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name='(home)'>
        {Platform.select({
          ios: <Icon sf='house.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='home' />} />
          ),
        })}
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='instagram'>
        {Platform.select({
          ios: <Icon sf='newspaper' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='book-open' />} />
          ),
        })}
        <Label>Instagram</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='settings'>
        {Platform.select({
          ios: <Icon sf='gear' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='settings' />} />
          ),
        })}
        <Label>Settings</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
    </SettingsProvider>
  );
}
