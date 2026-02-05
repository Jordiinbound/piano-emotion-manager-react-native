/**
 * Calendario Compartido del Equipo
 * Piano Emotion Manager
 * 
 * Visualiza las asignaciones de todos los técnicos en formato de calendario.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

// ==========================================
// TIPOS
// ==========================================

export interface WorkAssignment {
  id: number;
  technicianId: number;
  scheduledDate: Date;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDuration?: number;
  status: 'unassigned' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  clientName?: string;
  serviceType?: string;
  address?: string;
}

export interface Technician {
  id: number;
  userId: number;
  displayName: string;
  color: string;
  assignments: WorkAssignment[];
}

export interface DailySchedule {
  date: Date;
  technicians: Technician[];
}

interface TeamCalendarProps {
  schedule: DailySchedule;
  onDateChange: (date: Date) => void;
  onAssignmentPress: (assignment: WorkAssignment) => void;
  onCreateAssignment: (technicianId: number, time: string) => void;
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

// ==========================================
// CONSTANTES
// ==========================================

const HOUR_HEIGHT = 60;
const COLUMN_WIDTH = 150;
const TIME_COLUMN_WIDTH = 60;

const STATUS_COLORS: Record<string, string> = {
  unassigned: '#6b7280',
  assigned: '#3b82f6',
  accepted: '#8b5cf6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const PRIORITY_INDICATORS: Record<string, string> = {
  low: '○',
  normal: '●',
  high: '◆',
  urgent: '⚠',
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function TeamCalendar({
  schedule,
  onDateChange,
  onAssignmentPress,
  onCreateAssignment,
  workingHoursStart = '08:00',
  workingHoursEnd = '20:00',
}: TeamCalendarProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  
  // Generar horas del día
  const hours = useMemo(() => {
    const startHour = parseInt(workingHoursStart.split(':')[0]);
    const endHour = parseInt(workingHoursEnd.split(':')[0]);
    const result = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return result;
  }, [workingHoursStart, workingHoursEnd]);
  
  // Navegación de fecha
  const goToPreviousDay = () => {
    const newDate = new Date(schedule.date);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };
  
  const goToNextDay = () => {
    const newDate = new Date(schedule.date);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };
  
  const goToToday = () => {
    onDateChange(new Date());
  };
  
  // Formatear fecha
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return date.toLocaleDateString('es-ES', options);
  };
  
  // Calcular posición de una asignación
  const getAssignmentPosition = (assignment: WorkAssignment) => {
    const startHour = parseInt(workingHoursStart.split(':')[0]);
    
    if (!assignment.scheduledStartTime) {
      return { top: 0, height: HOUR_HEIGHT };
    }
    
    const [hours, minutes] = assignment.scheduledStartTime.split(':').map(Number);
    const top = (hours - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    const duration = assignment.estimatedDuration || 60;
    const height = (duration / 60) * HOUR_HEIGHT;
    
    return { top, height: Math.max(height, 30) };
  };
  
  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <View style={styles.container}>
      {/* Header con navegación de fecha */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToToday} style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(schedule.date)}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Leyenda de estados */}
      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {status === 'in_progress' ? 'En curso' : 
               status === 'unassigned' ? 'Sin asignar' :
               status === 'assigned' ? 'Asignado' :
               status === 'accepted' ? 'Aceptado' :
               status === 'completed' ? 'Completado' : 'Cancelado'}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendario */}
      <ScrollView style={styles.calendarContainer} horizontal>
        <View>
          {/* Cabecera de técnicos */}
          <View style={[styles.technicianHeader, { backgroundColor: colors.card }]}>
            <View style={[styles.timeColumnHeader, { width: TIME_COLUMN_WIDTH }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hora</Text>
            </View>
            {schedule.technicians.map((tech) => (
              <View
                key={tech.id}
                style={[
                  styles.technicianColumn,
                  { width: COLUMN_WIDTH, borderLeftColor: tech.color },
                ]}
              >
                <View style={[styles.technicianAvatar, { backgroundColor: tech.color }]}>
                  <Text style={styles.technicianInitial}>
                    {tech.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.technicianName, { color: colors.text }]} numberOfLines={1}>
                  {tech.displayName}
                </Text>
                <Text style={[styles.assignmentCount, { color: colors.textSecondary }]}>
                  {tech.assignments.length} trabajos
                </Text>
              </View>
            ))}
          </View>
          
          {/* Grid de horas */}
          <ScrollView style={styles.gridContainer}>
            <View style={styles.grid}>
              {/* Columna de horas */}
              <View style={[styles.timeColumn, { width: TIME_COLUMN_WIDTH }]}>
                {hours.map((hour) => (
                  <View key={hour} style={[styles.hourCell, { height: HOUR_HEIGHT }]}>
                    <Text style={[styles.hourText, { color: colors.textSecondary }]}>
                      {hour}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Columnas de técnicos */}
              {schedule.technicians.map((tech) => (
                <View
                  key={tech.id}
                  style={[
                    styles.technicianGrid,
                    { width: COLUMN_WIDTH, backgroundColor: colors.background },
                  ]}
                >
                  {/* Líneas de hora */}
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.hourSlot,
                        { height: HOUR_HEIGHT, borderBottomColor: colors.border },
                      ]}
                      onPress={() => onCreateAssignment(tech.userId, hour)}
                    />
                  ))}
                  
                  {/* Asignaciones */}
                  {tech.assignments.map((assignment) => {
                    const { top, height } = getAssignmentPosition(assignment);
                    return (
                      <TouchableOpacity
                        key={assignment.id}
                        style={[
                          styles.assignment,
                          {
                            top,
                            height,
                            backgroundColor: STATUS_COLORS[assignment.status],
                            borderLeftColor: tech.color,
                          },
                        ]}
                        onPress={() => onAssignmentPress(assignment)}
                      >
                        <View style={styles.assignmentHeader}>
                          <Text style={styles.priorityIndicator}>
                            {PRIORITY_INDICATORS[assignment.priority]}
                          </Text>
                          <Text style={styles.assignmentTime}>
                            {assignment.scheduledStartTime}
                          </Text>
                        </View>
                        <Text style={styles.assignmentClient} numberOfLines={1}>
                          {assignment.clientName || 'Cliente'}
                        </Text>
                        {height > 40 && (
                          <Text style={styles.assignmentService} numberOfLines={1}>
                            {assignment.serviceType || 'Servicio'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      
      {/* Indicador de hora actual */}
      {isToday(schedule.date) && (
        <CurrentTimeIndicator
          workingHoursStart={workingHoursStart}
          technicianCount={schedule.technicians.length}
        />
      )}
    </View>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function CurrentTimeIndicator({
  workingHoursStart,
  technicianCount,
}: {
  workingHoursStart: string;
  technicianCount: number;
}) {
  const now = new Date();
  const startHour = parseInt(workingHoursStart.split(':')[0]);
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const top = (currentHour - startHour) * HOUR_HEIGHT + (currentMinutes / 60) * HOUR_HEIGHT;
  const width = TIME_COLUMN_WIDTH + COLUMN_WIDTH * technicianCount;
  
  return (
    <View
      style={[
        styles.currentTimeIndicator,
        { top: top + 120, width }, // 120 = header height aproximado
      ]}
    >
      <View style={styles.currentTimeDot} />
      <View style={styles.currentTimeLine} />
    </View>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navButton: {
    padding: 8,
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  calendarContainer: {
    flex: 1,
  },
  technicianHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  timeColumnHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  technicianColumn: {
    alignItems: 'center',
    padding: 8,
    borderLeftWidth: 3,
  },
  technicianAvatar: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  technicianInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  technicianName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  assignmentCount: {
    fontSize: 11,
    marginTop: 2,
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
  },
  timeColumn: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  hourCell: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  hourText: {
    fontSize: 11,
  },
  technicianGrid: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
  },
  hourSlot: {
    borderBottomWidth: 1,
  },
  assignment: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 4,
    padding: 6,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityIndicator: {
    color: '#fff',
    fontSize: 10,
  },
  assignmentTime: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  assignmentClient: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  assignmentService: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ef4444',
  },
});

export default TeamCalendar;
