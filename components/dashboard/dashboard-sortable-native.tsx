/**
 * Dashboard Sortable Native Component
 * Drag & drop DIRECTO sin modo edición
 * Long press para activar el drag, arrastrar y soltar
 * 
 * IMPORTANTE: En móvil, este componente maneja su propio scroll
 * para que el drag funcione correctamente
 */
import { memo, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  ShadowDecorator,
  OpacityDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';

import { useThemeColor } from '@/hooks/use-theme-color';
import { DashboardSectionId, DashboardSectionConfig } from '@/hooks/use-dashboard-preferences';

interface DashboardSortableNativeProps {
  sections: DashboardSectionConfig[];
  isEditMode: boolean;
  onReorder: (sections: DashboardSectionConfig[]) => void;
  onToggleVisibility: (sectionId: DashboardSectionId) => void;
  renderSection: (sectionId: DashboardSectionId) => React.ReactNode;
}

export const DashboardSortableNative = memo(function DashboardSortableNative({
  sections,
  isEditMode,
  onReorder,
  onToggleVisibility,
  renderSection,
}: DashboardSortableNativeProps) {
  const accent = useThemeColor({}, 'accent');
  const [isDragging, setIsDragging] = useState(false);

  // Filtrar solo secciones visibles
  const visibleSections = sections.filter(s => s.visible);

  const handleDragBegin = useCallback(() => {
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(
    ({ data }: { data: DashboardSectionConfig[] }) => {
      setIsDragging(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Reconstruir el array completo manteniendo las secciones ocultas en su posición
      const hiddenSections = sections.filter(s => !s.visible);
      const newSections = [...data, ...hiddenSections];
      onReorder(newSections);
    },
    [sections, onReorder]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DashboardSectionConfig>) => {
      if (!item.visible) return null;

      return (
        <ScaleDecorator activeScale={1.03}>
          <ShadowDecorator>
            <OpacityDecorator activeOpacity={0.7}>
              <TouchableOpacity
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }}
                delayLongPress={150}
                activeOpacity={1}
                disabled={isActive}
                style={[
                  styles.sectionContainer,
                  isActive && styles.sectionContainerActive,
                ]}
              >
                <View pointerEvents={isActive ? 'none' : 'auto'}>
                  {renderSection(item.id)}
                </View>
              </TouchableOpacity>
            </OpacityDecorator>
          </ShadowDecorator>
        </ScaleDecorator>
      );
    },
    [renderSection]
  );

  const keyExtractor = useCallback((item: DashboardSectionConfig) => item.id, []);

  return (
    <DraggableFlatList
      data={visibleSections}
      onDragBegin={handleDragBegin}
      onDragEnd={handleDragEnd}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      containerStyle={styles.flatListContainer}
      activationDistance={5}
      dragItemOverflow={true}
      autoscrollSpeed={200}
      autoscrollThreshold={80}
    />
  );
});

const styles = StyleSheet.create({
  flatListContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionContainerActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
});
