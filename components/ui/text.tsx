import { useColor } from '@/hooks/useColor';
import { FONT_SIZE } from '@/theme/globals';
import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native';

const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'DMSans_400Regular',
  '200': 'DMSans_400Regular',
  '300': 'DMSans_400Regular',
  '400': 'DMSans_400Regular',
  '500': 'DMSans_500Medium',
  '600': 'DMSans_500Medium',
  '700': 'DMSans_700Bold',
  '800': 'DMSans_800ExtraBold',
  '900': 'DMSans_800ExtraBold',
  normal: 'DMSans_400Regular',
  bold: 'DMSans_700Bold',
};

function resolveFontFamily(weight?: TextStyle['fontWeight']): string {
  return WEIGHT_TO_FAMILY[String(weight ?? '400')] ?? 'DMSans_400Regular';
}

type TextVariant = 'body' | 'title' | 'subtitle' | 'caption' | 'heading' | 'link';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  lightColor?: string;
  darkColor?: string;
  children: React.ReactNode;
}

export const Text = forwardRef<RNText, TextProps>(
  ({ variant = 'body', lightColor, darkColor, style, children, ...props }, ref) => {
    const textColor = useColor('text', { light: lightColor, dark: darkColor });
    const mutedColor = useColor('textMuted');

    const getVariantStyle = (): TextStyle => {
      switch (variant) {
        case 'heading':
          return { color: textColor, fontSize: 28, fontFamily: 'DMSans_800ExtraBold' };
        case 'title':
          return { color: textColor, fontSize: 24, fontFamily: 'DMSans_700Bold' };
        case 'subtitle':
          return { color: textColor, fontSize: 19, fontFamily: 'DMSans_500Medium' };
        case 'caption':
          return { color: mutedColor, fontSize: FONT_SIZE, fontFamily: 'DMSans_400Regular' };
        case 'link':
          return { color: textColor, fontSize: FONT_SIZE, fontFamily: 'DMSans_500Medium', textDecorationLine: 'underline' };
        default:
          return { color: textColor, fontSize: FONT_SIZE, fontFamily: 'DMSans_400Regular' };
      }
    };

    // Flatten the user's style so we can intercept fontWeight and map it to the right family
    const flat = StyleSheet.flatten(style) as TextStyle | undefined;
    const overrideFamily = flat?.fontWeight ? resolveFontFamily(flat.fontWeight) : undefined;
    const finalStyle: TextStyle[] = [
      getVariantStyle(),
      flat ? { ...flat, fontWeight: undefined, fontFamily: overrideFamily ?? flat.fontFamily ?? getVariantStyle().fontFamily } : {},
    ];

    return (
      <RNText ref={ref} style={finalStyle} {...props}>
        {children}
      </RNText>
    );
  }
);

Text.displayName = 'Text';
