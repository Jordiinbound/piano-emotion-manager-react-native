/**
 * TasksWidget - Widget de tareas del dashboard
 * Muestra las tareas pendientes del usuario
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface WidgetProps {
  config?: Record<string, any>;
  isEditing?: boolean;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';
}

export const TasksWidget = React.memo(function TasksWidget({ config, isEditing }: WidgetProps) {
  const { colors } = useTheme();

  // Simulación de tareas (conectar con hook real cuando esté disponible)
  const tasks = [
    { id: '1', title: 'Llamar a cliente para confirmar cita', completed: false },
    { id: '2', title: 'Revisar inventario de cuerdas', completed: false },
    { id: '3', title: 'Enviar factura pendiente', completed: true },
  ];

  if (isEditing) {
    return (
      <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
        <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Vista previa de Tareas
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.widgetContent, { backgroundColor: colors.card }]}>
      <ThemedText style={[styles.tasksTitle, { color: colors.text }]}>
        Tareas pendientes
      </ThemedText>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {tasks.map((task) => (
          <View key={task.id} style={[styles.taskItem, { borderBottomColor: colors.border }]}>
            <Ionicons 
              name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} 
              size={20} 
              color={task.completed ? '#10B981' : colors.textSecondary} 
            />
            <ThemedText 
              style={[
                styles.taskText, 
                { color: task.completed ? colors.textSecondary : colors.text },
                task.completed && styles.taskCompleted
              ]}
            >
              {task.title}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});
const styles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
  },
});