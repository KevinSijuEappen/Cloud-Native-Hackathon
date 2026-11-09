import { Image, type ImageStyle, type StyleProp } from 'react-native';

const source = require('../../assets/convergence-logo.png');

export function Logo({ size = 96, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      accessibilityLabel="Convergence"
      source={source}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}
