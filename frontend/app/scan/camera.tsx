import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Button from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photosTaken, setPhotosTaken] = useState<string[]>([]);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera{' \n'}to scan your fridge
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        </SafeAreaView>
      </View>
    );
  }

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo && photo.base64) {
        const newPhotos = [...photosTaken, `data:image/jpeg;base64,${photo.base64}`];
        setPhotosTaken(newPhotos);

        if (newPhotos.length >= 2) {
          // Navigate to processing/ingredients screen
          router.push('/scan/ingredients');
        } else {
          Alert.alert(
            'Great!',
            `Photo ${newPhotos.length}/2 captured. Take one more photo.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <SafeAreaView style={styles.cameraOverlay}>
          {/* Header */}
          <Animated.View 
            entering={FadeInDown.duration(600)}
            style={styles.header}
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.photoCount}>{photosTaken.length}/2</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Instructions */}
          <Animated.View 
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.instructions}
          >
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>
                {photosTaken.length === 0 ? 'Take a wide shot' : 'Take a close-up'}
              </Text>
              <Text style={styles.instructionText}>
                {photosTaken.length === 0
                  ? 'Capture the full view of your fridge'
                  : 'Get closer to see details'}
              </Text>
            </View>
          </Animated.View>

          {/* Camera Controls */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.controls}
          >
            <View style={styles.controlsRow}>
              <View style={{ width: 60 }} />
              
              <Pressable
                onPress={handleTakePhoto}
                style={styles.captureButton}
              >
                <View style={styles.captureButtonInner} />
              </Pressable>

              <Pressable
                onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                style={styles.flipButton}
              >
                <Ionicons name="camera-reverse" size={32} color={colors.text} />
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.base,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    backgroundColor: colors.background + 'CC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  instructions: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: colors.background + 'DD',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructionText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  controls: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.textSecondary,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});