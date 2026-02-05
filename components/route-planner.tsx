import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { 
  travelTimeService, 
  RouteStop, 
  OptimizedRoute 
} from '@/services/travel-time-service';
import { BorderRadius, Spacing } from '@/constants/theme';

interface RoutePlannerProps {
  appointments: {
    id: string;
    clientName: string;
    address: string;
    time: string;
  }[];
  onOptimize?: (optimizedOrder: string[]) => void;
}

export function RoutePlanner({ appointments, onOptimize }: RoutePlannerProps) {
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const border = useThemeColor({}, 'border');

  useEffect(() => {
    if (appointments.length > 0) {
      calculateRoute();
    }
  }, [appointments]);

  const calculateRoute = async () => {
    setIsCalculating(true);
    setIsOptimized(false);

    const stops: RouteStop[] = appointments.map(apt => ({
      id: apt.id,
      name: apt.clientName,
      address: apt.address,
      scheduledTime: apt.time,
    }));

    try {
      const calculatedRoute = await travelTimeService.calculateRoute(stops);
      setRoute(calculatedRoute);
    } catch (error) {
    } finally {
      setIsCalculating(false);
    }
  };

  const optimizeRoute = async () => {
    setIsCalculating(true);

    const stops: RouteStop[] = appointments.map(apt => ({
      id: apt.id,
      name: apt.clientName,
      address: apt.address,
      scheduledTime: apt.time,
    }));

    try {
      const optimizedRoute = await travelTimeService.optimizeRoute(stops);
      setRoute(optimizedRoute);
      setIsOptimized(true);

      if (onOptimize) {
        onOptimize(optimizedRoute.stops.map(s => s.id));
      }
    } catch (error) {
    } finally {
      setIsCalculating(false);
    }
  };

  const openInMaps = () => {
    if (!route || route.stops.length < 2) return;

    const url = travelTimeService.getGoogleMapsRouteUrl(route.stops);
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (appointments.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
        <IconSymbol name="map" size={32} color={textSecondary} />
        <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
          No hay citas para planificar la ruta
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="map" size={20} color={primary} />
          <ThemedText style={styles.headerTitle}>Planificador de Ruta</ThemedText>
        </View>
        {isOptimized && (
          <View style={[styles.optimizedBadge, { backgroundColor: success + '20' }]}>
            <IconSymbol name="checkmark.circle" size={14} color={success} />
            <ThemedText style={[styles.optimizedText, { color: success }]}>
              Optimizada
            </ThemedText>
          </View>
        )}
      </View>

      {/* Resumen */}
      {route && (
        <View style={[styles.summary, { backgroundColor: cardBg }]}>
          <View style={styles.summaryItem}>
            <IconSymbol name="car" size={18} color={primary} />
            <View>
              <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
                Distancia total
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {route.totalDistanceText}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: border }]} />
          <View style={styles.summaryItem}>
            <IconSymbol name="clock" size={18} color={primary} />
            <View>
              <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
                Tiempo estimado
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {route.totalDurationText}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Lista de paradas */}
      <ScrollView style={styles.stopsList} showsVerticalScrollIndicator={false}>
        {isCalculating ? (
          <View style={styles.loading}>
            <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
              Calculando ruta...
            </ThemedText>
          </View>
        ) : route ? (
          route.stops.map((stop, index) => (
            <View key={stop.id}>
              {/* Tiempo de viaje desde la parada anterior */}
              {stop.travelFromPrevious && (
                <View style={styles.travelInfo}>
                  <View style={[styles.travelLine, { backgroundColor: border }]} />
                  <View style={[styles.travelBadge, { backgroundColor: cardBg, borderColor: border }]}>
                    <IconSymbol name="car" size={12} color={textSecondary} />
                    <ThemedText style={[styles.travelText, { color: textSecondary }]}>
                      {stop.travelFromPrevious.durationText} • {stop.travelFromPrevious.distanceText}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Parada */}
              <View style={[styles.stopCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.stopNumber, { backgroundColor: primary }]}>
                  <ThemedText style={styles.stopNumberText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.stopInfo}>
                  <ThemedText style={styles.stopName}>{stop.name}</ThemedText>
                  <ThemedText style={[styles.stopAddress, { color: textSecondary }]} numberOfLines={1}>
                    {stop.address}
                  </ThemedText>
                  <View style={styles.stopTimes}>
                    {stop.scheduledTime && (
                      <View style={styles.timeItem}>
                        <IconSymbol name="calendar" size={12} color={primary} />
                        <ThemedText style={[styles.timeText, { color: primary }]}>
                          {formatTime(stop.scheduledTime)}
                        </ThemedText>
                      </View>
                    )}
                    {stop.estimatedArrival && stop.estimatedArrival !== stop.scheduledTime && (
                      <View style={styles.timeItem}>
                        <IconSymbol name="clock" size={12} color={warning} />
                        <ThemedText style={[styles.timeText, { color: warning }]}>
                          ~{formatTime(stop.estimatedArrival)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : null}
      </ScrollView>

      {/* Acciones */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, { borderColor: primary }]}
          onPress={optimizeRoute}
          disabled={isCalculating}
        >
          <IconSymbol name="arrow.triangle.swap" size={16} color={primary} />
          <ThemedText style={[styles.actionButtonText, { color: primary }]}>
            Optimizar
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: primary }]}
          onPress={openInMaps}
          disabled={!route || route.stops.length < 2}
        >
          <IconSymbol name="arrow.up.right.square" size={16} color="#fff" />
          <ThemedText style={styles.actionButtonTextPrimary}>
            Abrir en Maps
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optimizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  optimizedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: Spacing.md,
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  stopsList: {
    flex: 1,
  },
  loading: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  travelInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  travelLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    left: 20,
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  travelText: {
    fontSize: 11,
  },
  stopCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 12,
    marginBottom: 4,
  },
  stopTimes: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionButtonPrimary: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default RoutePlanner;
