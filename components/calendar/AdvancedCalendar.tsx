/**
 * Calendario Avanzado
 * Piano Emotion Manager
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar, type CalendarView, type EventInput } from '@/hooks/calendar';
import { useTranslation } from '@/hooks/use-translation';

// ============================================================================
// Types
// ============================================================================

interface CalendarEvent {
  id: number;
  type: string;
  title: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  status: string;
  color?: string;
  clientId?: number;
  assignedTo?: number;
}

// ============================================================================
// Event Colors
// ============================================================================

const eventTypeColors: Record<string, string> = {
  service: '#3b82f6',
  appointment: '#8b5cf6',
  reminder: '#f59e0b',
  block: '#6b7280',
  personal: '#10b981',
  meeting: '#ec4899',
};

const statusColors: Record<string, { bg: string; border: string }> = {
  tentative: { bg: '#fef3c7', border: '#f59e0b' },
  confirmed: { bg: '#dbeafe', border: '#3b82f6' },
  cancelled: { bg: '#fee2e2', border: '#ef4444' },
  completed: { bg: '#d1fae5', border: '#10b981' },
};

// ============================================================================
// Calendar Header
// ============================================================================

interface CalendarHeaderProps {
  view: CalendarView;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (type: CalendarView['type']) => void;
  onSettings?: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  onPrevious,
  onNext,
  onToday,
  onChangeView,
  onSettings,
}) => {
  const { t } = useTranslation();

  const formatTitle = () => {
    const date = view.date;
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric',
    };

    if (view.type === 'day') {
      options.day = 'numeric';
    }

    return date.toLocaleDateString('es-ES', options);
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.navButton} onPress={onPrevious}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNext}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.todayButton} onPress={onToday}>
          <Text style={styles.todayButtonText}>{t('calendar.today')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.headerTitle}>{formatTitle()}</Text>

      <View style={styles.headerRight}>
        <View style={styles.viewSelector}>
          {(['day', 'week', 'month'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.viewButton, view.type === type && styles.viewButtonActive]}
              onPress={() => onChangeView(type)}
            >
              <Text
                style={[
                  styles.viewButtonText,
                  view.type === type && styles.viewButtonTextActive,
                ]}
              >
                {t(`calendar.view.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {onSettings && (
          <TouchableOpacity style={styles.settingsButton} onPress={onSettings}>
            <Ionicons name="settings-outline" size={24} color="#374151" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Event Card
// ============================================================================

interface EventCardProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  compact?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onPress, compact }) => {
  const color = event.color || eventTypeColors[event.type] || '#3b82f6';
  const status = statusColors[event.status] || statusColors.confirmed;

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        compact && styles.eventCardCompact,
        { borderLeftColor: color, backgroundColor: status.bg },
      ]}
      onPress={() => onPress(event)}
    >
      <Text style={[styles.eventTitle, compact && styles.eventTitleCompact]} numberOfLines={1}>
        {event.title}
      </Text>
      {!compact && event.startTime && (
        <Text style={styles.eventTime}>
          {event.startTime} - {event.endTime}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Day View
// ============================================================================

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onSlotPress: (time: string) => void;
}

const DayView: React.FC<DayViewProps> = ({ date, events, onEventPress, onSlotPress }) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      if (!event.startTime) return false;
      const eventHour = parseInt(event.startTime.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  return (
    <ScrollView style={styles.dayView}>
      {hours.map((hour) => {
        const hourEvents = getEventsForHour(hour);
        const timeString = `${hour.toString().padStart(2, '0')}:00`;

        return (
          <TouchableOpacity
            key={hour}
            style={styles.hourRow}
            onPress={() => onSlotPress(timeString)}
          >
            <Text style={styles.hourLabel}>{timeString}</Text>
            <View style={styles.hourContent}>
              {hourEvents.map((event) => (
                <EventCard key={event.id} event={event} onPress={onEventPress} />
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ============================================================================
// Week View
// ============================================================================

interface WeekViewProps {
  startDate: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onDayPress: (date: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ startDate, events, onEventPress, onDayPress }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((event) => event.startDate === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={styles.weekView}>
      {/* Header con días */}
      <View style={styles.weekHeader}>
        {days.map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.weekDayHeader, isToday(date) && styles.weekDayHeaderToday]}
            onPress={() => onDayPress(date)}
          >
            <Text style={styles.weekDayName}>
              {date.toLocaleDateString('es-ES', { weekday: 'short' })}
            </Text>
            <Text style={[styles.weekDayNumber, isToday(date) && styles.weekDayNumberToday]}>
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido */}
      <ScrollView style={styles.weekContent}>
        <View style={styles.weekGrid}>
          {days.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            return (
              <View key={index} style={styles.weekDayColumn}>
                {dayEvents.slice(0, 5).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={onEventPress}
                    compact
                  />
                ))}
                {dayEvents.length > 5 && (
                  <Text style={styles.moreEvents}>+{dayEvents.length - 5} más</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// Month View
// ============================================================================

interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onDayPress: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ date, events, onEventPress, onDayPress }) => {
  const { t } = useTranslation();

  // Calcular días del mes
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Ajustar para empezar en lunes

  const days: (Date | null)[] = [];
  
  // Días vacíos al inicio
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  
  // Días del mes
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), i));
  }

  const getEventsForDay = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    return events.filter((event) => event.startDate === dateStr);
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  };

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <View style={styles.monthView}>
      {/* Header con días de la semana */}
      <View style={styles.monthHeader}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.monthWeekDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* Grid de días */}
      <View style={styles.monthGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.monthDay,
              day && isToday(day) && styles.monthDayToday,
            ]}
            onPress={() => day && onDayPress(day)}
            disabled={!day}
          >
            {day && (
              <>
                <Text style={[styles.monthDayNumber, isToday(day) && styles.monthDayNumberToday]}>
                  {day.getDate()}
                </Text>
                <View style={styles.monthDayEvents}>
                  {getEventsForDay(day).slice(0, 3).map((event) => (
                    <View
                      key={event.id}
                      style={[
                        styles.monthEventDot,
                        { backgroundColor: event.color || eventTypeColors[event.type] },
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface AdvancedCalendarProps {
  onCreateEvent?: (date: string, time?: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onSettings?: () => void;
}

export const AdvancedCalendar: React.FC<AdvancedCalendarProps> = ({
  onCreateEvent,
  onEditEvent,
  onSettings,
}) => {
  const { t } = useTranslation();
  const {
    events,
    isLoading,
    view,
    goToToday,
    goToPrevious,
    goToNext,
    changeView,
    setSelectedDate,
  } = useCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventPress = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    onEditEvent?.(event);
  }, [onEditEvent]);

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
    changeView('day');
  }, [setSelectedDate, changeView]);

  const handleSlotPress = useCallback((time: string) => {
    const dateStr = view.date.toISOString().split('T')[0];
    onCreateEvent?.(dateStr, time);
  }, [view.date, onCreateEvent]);

  const renderContent = () => {
    switch (view.type) {
      case 'day':
        return (
          <DayView
            date={view.date}
            events={events as CalendarEvent[]}
            onEventPress={handleEventPress}
            onSlotPress={handleSlotPress}
          />
        );
      case 'week':
        return (
          <WeekView
            startDate={view.date}
            events={events as CalendarEvent[]}
            onEventPress={handleEventPress}
            onDayPress={handleDayPress}
          />
        );
      case 'month':
        return (
          <MonthView
            date={view.date}
            events={events as CalendarEvent[]}
            onEventPress={handleEventPress}
            onDayPress={handleDayPress}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <CalendarHeader
        view={view}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        onChangeView={changeView}
        onSettings={onSettings}
      />
      {renderContent()}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 80, // Header más alto para "respirar"
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  todayButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  todayButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    padding: 4,
    height: 160, // Altura compacta del contenedor de botones
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40, // Separación mayor
  },
  viewButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 4,
    minWidth: 90,
    height: 48, // Altura de botón cómoda
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewButtonTextActive: {
    color: '#1f2937',
    fontWeight: '500',
  },
  // Day View
  dayView: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hourLabel: {
    width: 60,
    paddingTop: 8,
    paddingRight: 12,
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
  },
  hourContent: {
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  // Week View
  weekView: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  weekDayHeaderToday: {
    backgroundColor: '#dbeafe',
  },
  weekDayName: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 2,
  },
  weekDayNumberToday: {
    color: '#3b82f6',
  },
  weekContent: {
    flex: 1,
  },
  weekGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  weekDayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    padding: 4,
  },
  moreEvents: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  // Month View
  monthView: {
    flex: 1,
    padding: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
  },
  monthDayToday: {
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  monthDayNumber: {
    fontSize: 14,
    color: '#374151',
  },
  monthDayNumberToday: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  monthDayEvents: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  monthEventDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  // Event Card
  eventCard: {
    backgroundColor: '#dbeafe',
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  eventCardCompact: {
    padding: 4,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  eventTitleCompact: {
    fontSize: 11,
  },
  eventTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default AdvancedCalendar;
