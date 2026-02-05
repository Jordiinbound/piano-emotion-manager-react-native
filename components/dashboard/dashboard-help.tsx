'use client';

import { memo } from 'react';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  icon_color: string;
  display_order: number;
}

export const DashboardHelp = memo(function DashboardHelp() {
  const router = useRouter();
  const [sections, setSections] = useState<HelpSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textSecondary');

  useEffect(() => {
    async function loadHelpSections() {
      try {
        const response = await fetch('/api/help/sections-with-items');
        if (!response.ok) {
          throw new Error('Failed to fetch help sections');
        }
        const data = await response.json();
        // Solo tomar las primeras 4-5 secciones para el scroll horizontal
        setSections(data.slice(0, 5));
      } catch (error) {
        console.error('Error loading help sections:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHelpSections();
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Header colapsable */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerContent}>
          <ThemedText type="subtitle" style={styles.title}>
            ❓ Ayuda
          </ThemedText>
        </View>
        <IconSymbol
          name={isExpanded ? 'chevron.down' : 'chevron.right'}
          size={20}
          color={textTertiary}
        />
      </Pressable>

      {/* Contenido expandible */}
      {isExpanded && (
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accent} />
              <ThemedText style={styles.loadingText}>Cargando ayuda...</ThemedText>
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No hay información de ayuda disponible
              </ThemedText>
            </View>
          ) : (
            <>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.topicsContainer}
                contentContainerStyle={styles.topicsContent}
              >
                {sections.map((section) => (
                  <Pressable
                    key={section.id}
                    style={[styles.topicCard, { borderLeftColor: section.icon_color || accent }]}
                    onPress={() => router.push('/help')}
                  >
                    <View style={styles.topicIconContainer}>
                      <IconSymbol
                        name={section.icon as any}
                        size={24}
                        color={section.icon_color || accent}
                      />
                    </View>
                    <ThemedText style={styles.topicTitle}>{section.title}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
              
              <Pressable 
                style={[styles.viewAllButton, { backgroundColor: accent }]}
                onPress={() => router.push('/help')}
              >
                <ThemedText style={styles.viewAllButtonText}>
                  Ver toda la ayuda →
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  topicsContainer: {
    marginBottom: 16,
  },
  topicsContent: {
    paddingRight: 16,
  },
  topicCard: {
    width: 140,
    marginRight: 12,
    padding: 12,
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 3,
  },
  topicIconContainer: {
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  viewAllButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
