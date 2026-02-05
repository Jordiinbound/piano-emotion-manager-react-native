import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLanguage, SupportedLanguage, supportedLanguages } from '@/contexts/language-context';
import { BorderRadius, Spacing } from '@/constants/theme';

interface LanguageSelectorProps {
  /** Show as a modal (default) or inline list */
  mode?: 'modal' | 'inline';
  /** Callback when language changes */
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export function LanguageSelector({ mode = 'modal', onLanguageChange }: LanguageSelectorProps) {
  const { currentLanguage, currentLanguageInfo, changeLanguage, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'tint');

  const handleSelectLanguage = async (language: SupportedLanguage) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    await changeLanguage(language);
    onLanguageChange?.(language);
    
    if (mode === 'modal') {
      setModalVisible(false);
    }
  };

  const renderLanguageItem = ({ item }: { item: typeof supportedLanguages[0] }) => {
    const isSelected = item.code === currentLanguage;
    
    return (
      <Pressable
        style={[
          styles.languageItem,
          { borderBottomColor: borderColor },
          isSelected && { backgroundColor: `${primary}15` },
        ]}
        onPress={() => handleSelectLanguage(item.code)}
      >
        <View style={styles.languageInfo}>
          <ThemedText style={styles.flag}>{item.flag}</ThemedText>
          <View style={styles.languageText}>
            <ThemedText style={[styles.languageName, isSelected && { color: primary }]}>
              {item.nativeName}
            </ThemedText>
            <ThemedText style={[styles.languageNameSecondary, { color: textSecondary }]}>
              {item.name}
            </ThemedText>
          </View>
        </View>
        {isSelected && (
          <IconSymbol name="checkmark.circle.fill" size={24} color={primary} />
        )}
      </Pressable>
    );
  };

  if (mode === 'inline') {
    return (
      <View style={[styles.inlineContainer, { backgroundColor: cardBg, borderColor }]}>
        <ThemedText style={styles.inlineTitle}>{t('settings.selectLanguage')}</ThemedText>
        <FlatList
          data={supportedLanguages}
          keyExtractor={(item) => item.code}
          renderItem={renderLanguageItem}
          scrollEnabled={false}
        />
      </View>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        style={[styles.triggerButton, { borderBottomColor: borderColor }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.triggerContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${primary}15` }]}>
            <IconSymbol name="globe" size={20} color={primary} />
          </View>
          <View style={styles.triggerText}>
            <ThemedText style={styles.triggerLabel}>{t('settings.language')}</ThemedText>
            <ThemedText style={[styles.triggerValue, { color: textSecondary }]}>
              {currentLanguageInfo.flag} {currentLanguageInfo.nativeName}
            </ThemedText>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={16} color={textSecondary} />
      </Pressable>

      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.modalTitle}>{t('settings.selectLanguage')}</ThemedText>
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <IconSymbol name="xmark.circle.fill" size={28} color={textSecondary} />
              </Pressable>
            </View>

            {/* Language List */}
            <FlatList
              data={supportedLanguages}
              keyExtractor={(item) => item.code}
              renderItem={renderLanguageItem}
              contentContainerStyle={styles.listContent}
            />

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
              <ThemedText style={[styles.footerText, { color: textSecondary }]}>
                {t('settings.language')}: {currentLanguageInfo.nativeName}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger Button Styles
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    gap: 2,
  },
  triggerLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  triggerValue: {
    fontSize: 13,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  modalFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },

  // Language Item Styles
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flag: {
    fontSize: 28,
  },
  languageText: {
    gap: 2,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageNameSecondary: {
    fontSize: 13,
  },

  // Inline Mode Styles
  inlineContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: Spacing.md,
    textTransform: 'uppercase',
  },
});

export default LanguageSelector;
