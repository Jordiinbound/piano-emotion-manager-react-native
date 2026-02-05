/**
 * Premium Feature Wrapper Component
 * Piano Emotion Manager
 * 
 * Wraps UI elements that require a premium subscription.
 * Shows disabled styling for locked features and triggers upgrade modal on click.
 */

import React, { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, FeatureKey } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';

interface PremiumFeatureProps {
  /** The feature key to check access for */
  feature: FeatureKey;
  /** The content to render */
  children: ReactNode;
  /** Optional callback when feature is available and clicked */
  onPress?: () => void;
  /** Custom style for the container */
  style?: ViewStyle;
  /** Whether to show a lock icon overlay */
  showLockIcon?: boolean;
  /** Whether to show a "PRO" badge */
  showProBadge?: boolean;
  /** Custom disabled opacity (default: 0.5) */
  disabledOpacity?: number;
  /** Disable the touch interaction completely */
  disabled?: boolean;
  /** Fallback content to show when locked (instead of children) */
  lockedContent?: ReactNode;
}

export function PremiumFeature({
  feature,
  children,
  onPress,
  style,
  showLockIcon = true,
  showProBadge = false,
  disabledOpacity = 0.5,
  disabled = false,
  lockedContent,
}: PremiumFeatureProps) {
  const {
    hasFeature,
    isFeatureLocked,
    getFeatureInfo,
    getMinimumPlanForFeature,
    showUpgradeModal,
    upgradeModalFeature,
    upgradeModalPlan,
    openUpgradeModal,
    closeUpgradeModal,
  } = useSubscription();

  const isLocked = isFeatureLocked(feature);
  const featureInfo = getFeatureInfo(feature);
  const requiredPlan = getMinimumPlanForFeature(feature);

  const handlePress = () => {
    if (disabled) return;
    
    if (isLocked) {
      openUpgradeModal(feature);
    } else if (onPress) {
      onPress();
    }
  };

  // Determine what content to show
  const contentToRender = isLocked && lockedContent ? lockedContent : children;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          style,
          isLocked && { opacity: disabledOpacity },
        ]}
        onPress={handlePress}
        activeOpacity={isLocked ? 0.7 : 0.8}
        disabled={disabled}
      >
        <View style={styles.contentWrapper}>
          {contentToRender}
          
          {/* Lock icon overlay */}
          {isLocked && showLockIcon && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockIconContainer}>
                <Ionicons name="lock-closed" size={16} color="#fff" />
              </View>
            </View>
          )}
          
          {/* PRO badge */}
          {isLocked && showProBadge && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Upgrade Modal - only render if this feature triggered it */}
      {upgradeModalFeature === feature && (
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={closeUpgradeModal}
          feature={featureInfo || null}
          requiredPlan={requiredPlan || null}
        />
      )}
    </>
  );
}

/**
 * Hook-based alternative for more complex use cases
 */
export function usePremiumFeature(feature: FeatureKey) {
  const {
    hasFeature,
    isFeatureLocked,
    getFeatureInfo,
    getMinimumPlanForFeature,
    checkFeatureAndShowModal,
  } = useSubscription();

  return {
    isLocked: isFeatureLocked(feature),
    hasAccess: hasFeature(feature),
    featureInfo: getFeatureInfo(feature),
    requiredPlan: getMinimumPlanForFeature(feature),
    /** Call this before executing the feature action */
    checkAccess: () => checkFeatureAndShowModal(feature),
  };
}

/**
 * Simple wrapper that just applies disabled styling
 */
interface DisabledWrapperProps {
  disabled: boolean;
  children: ReactNode;
  style?: ViewStyle;
  opacity?: number;
}

export function DisabledWrapper({
  disabled,
  children,
  style,
  opacity = 0.5,
}: DisabledWrapperProps) {
  return (
    <View style={[style, disabled && { opacity }]}>
      {children}
    </View>
  );
}

/**
 * Premium button that shows lock state
 */
interface PremiumButtonProps {
  feature: FeatureKey;
  title: string;
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function PremiumButton({
  feature,
  title,
  icon,
  onPress,
  style,
  variant = 'primary',
}: PremiumButtonProps) {
  const { isLocked, checkAccess } = usePremiumFeature(feature);

  const handlePress = () => {
    if (checkAccess()) {
      onPress();
    }
  };

  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    isLocked && styles.buttonLocked,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    variant === 'primary' && styles.buttonTextPrimary,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'outline' && styles.buttonTextOutline,
    isLocked && styles.buttonTextLocked,
  ];

  return (
    <TouchableOpacity style={buttonStyles} onPress={handlePress}>
      {icon && (
        <Ionicons 
          name={icon as any} 
          size={18} 
          color={isLocked ? '#9ca3af' : (variant === 'primary' ? '#fff' : '#3b82f6')} 
        />
      )}
      <Text style={textStyles}>{title}</Text>
      {isLocked && (
        <Ionicons name="lock-closed" size={14} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  contentWrapper: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  lockIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  proBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  // Button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: '#eff6ff',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonLocked: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#3b82f6',
  },
  buttonTextOutline: {
    color: '#3b82f6',
  },
  buttonTextLocked: {
    color: '#9ca3af',
  },
});

export default PremiumFeature;
