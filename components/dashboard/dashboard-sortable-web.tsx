/**
 * Dashboard Sortable Web Component
 * Drag & drop DIRECTO sin modo edición
 * El drag se activa SOLO desde el handle (indicador de 4 puntos)
 * Los clics en el resto de la sección funcionan normalmente
 */
import { memo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useThemeColor } from '@/hooks/use-theme-color';
import { DashboardSectionId, DashboardSectionConfig } from '@/hooks/use-dashboard-preferences';

interface DashboardSortableWebProps {
  sections: DashboardSectionConfig[];
  isEditMode: boolean;
  onReorder: (sections: DashboardSectionConfig[]) => void;
  onToggleVisibility: (sectionId: DashboardSectionId) => void;
  renderSection: (sectionId: DashboardSectionId) => React.ReactNode;
}

// Animación de drop suave
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

// Componente de item sortable
interface SortableItemProps {
  section: DashboardSectionConfig;
  isDragging: boolean;
  accent: string;
  renderSection: (sectionId: DashboardSectionId) => React.ReactNode;
}

const SortableItem = memo(function SortableItem({
  section,
  isDragging,
  accent,
  renderSection,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isItemDragging ? 1000 : 1,
    position: 'relative' as const,
  };

  if (!section.visible) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          marginBottom: 0,
          borderRadius: 4,
          overflow: 'hidden',
          opacity: isItemDragging ? 0.3 : 1,
          transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isItemDragging ? '0 8px 32px rgba(0,0,0,0.2)' : 'none',
          position: 'relative',
        }}
      >
        {/* Handle de drag - SOLO este elemento activa el drag */}
        {/* Posicionado en la esquina superior derecha, pequeño y discreto */}
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            zIndex: 100,
            cursor: 'grab',
          }}
          className="drag-handle"
        >
          {/* 4 puntos pequeños en cuadrícula 2x2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <div style={{ width: 2, height: 2, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
              <div style={{ width: 2, height: 2, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <div style={{ width: 2, height: 2, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
              <div style={{ width: 2, height: 2, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
            </div>
          </div>
        </div>
        
        {/* Contenido de la sección - clics funcionan normalmente */}
        {renderSection(section.id)}
      </div>
      
      {/* CSS para mostrar handle en hover */}
      <style>{`
        div:hover > .drag-handle {
          opacity: 1 !important;
        }
        .drag-handle:active {
          cursor: grabbing !important;
        }
      `}</style>
    </div>
  );
});

// Componente de overlay para el drag
interface DragOverlayContentProps {
  section: DashboardSectionConfig;
  accent: string;
  renderSection: (sectionId: DashboardSectionId) => React.ReactNode;
}

const DragOverlayContent = memo(function DragOverlayContent({
  section,
  accent,
  renderSection,
}: DragOverlayContentProps) {
  return (
    <div
      style={{
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        border: `3px solid ${accent}`,
        backgroundColor: '#FFFFFF',
        cursor: 'grabbing',
      }}
    >
      <div style={{ opacity: 0.9, pointerEvents: 'none' }}>
        {renderSection(section.id)}
      </div>
    </div>
  );
});

export const DashboardSortableWeb = memo(function DashboardSortableWeb({
  sections,
  isEditMode,
  onReorder,
  onToggleVisibility,
  renderSection,
}: DashboardSortableWebProps) {
  const accent = useThemeColor({}, 'accent');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensores: sin delay porque el drag solo se activa desde el handle
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Solo 5px de movimiento para activar
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Pequeño delay en touch para evitar activación accidental
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    document.body.style.cursor = '';

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      onReorder(newSections);
    }
  }, [sections, onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    document.body.style.cursor = '';
  }, []);

  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null;
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <View style={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={visibleSections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleSections.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              isDragging={activeId === section.id}
              accent={accent}
              renderSection={renderSection}
            />
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeSection ? (
            <DragOverlayContent
              section={activeSection}
              accent={accent}
              renderSection={renderSection}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
});
