import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, shadows, spacing } from '@/constants/theme';

interface SelectableCardProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SelectableCard({
  title,
  icon,
  selected,
  onPress,
  disabled = false,
  color = colors.primary,
}: SelectableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.card,
        animatedStyle,
        selected && styles.cardSelected,
        selected && { borderColor: color },
      ]}
    >
      {icon && (
        <View style={[styles.iconContainer, selected && { backgroundColor: color }]}>
          <Ionicons 
            name={icon} 
            size={24} 
            color={selected ? colors.text : colors.textSecondary} 
          />
        </View>
      )}
      <Text style={[styles.title, selected && styles.titleSelected]}>
        {title}
      </Text>
      {selected && (
        <View style={[styles.checkmark, { backgroundColor: color }]}>
          <Ionicons name="checkmark" size={16} color={colors.text} />
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...shadows.sm,
  },
  cardSelected: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    ...shadows.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  titleSelected: {
    color: colors.text,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
