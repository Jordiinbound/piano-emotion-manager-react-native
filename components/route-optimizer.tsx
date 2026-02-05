/**
 * Componente de Optimización de Rutas
 * Muestra las citas del día con rutas optimizadas y tiempos estimados
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Appointment } from '@/types/business';
import { Client, getClientFullName, getClientFormattedAddress } from '@/types';

interface RouteStop {
  appointment: Appointment;
  client: Client | null;
  address: string;
  estimatedArrival?: string;
  travelTime?: number; // minutos
  distance?: number; // km
}

interface RouteOptimizerProps {
  appointments: Appointment[];
  getClient: (id: string) => Client | undefined;
  onAppointmentPress?: (appointment: Appointment) => void;
}

export function RouteOptimizer({ appointments, getClient, onAppointmentPress }: RouteOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[] | null>(null);

  const accent = useThemeColor({}, 'accent');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');

  // Construir dirección completa del cliente
  const buildAddress = (client: Client | null): string => {
    if (!client) return '';
    const address = getClientFormattedAddress(client);
    return address ? address + ', España' : '';
  };

  // Preparar paradas de la ruta
  const routeStops = useMemo<RouteStop[]>(() => {
    return appointments
      .filter(apt => apt.status !== 'cancelled' && apt.status !== 'completed')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(apt => {
        const client = getClient(apt.clientId) || null;
        return {
          appointment: apt,
          client,
          address: buildAddress(client),
        };
      });
  }, [appointments, getClient]);

  // Calcular tiempo total estimado
  const totalStats = useMemo(() => {
    if (!optimizedRoute) return null;
    
    const totalTravelTime = optimizedRoute.reduce((sum, stop) => sum + (stop.travelTime || 0), 0);
    const totalDistance = optimizedRoute.reduce((sum, stop) => sum + (stop.distance || 0), 0);
    const totalServiceTime = routeStops.reduce((sum, stop) => sum + (stop.appointment.estimatedDuration || 60), 0);
    
    return {
      travelTime: totalTravelTime,
      distance: totalDistance,
      serviceTime: totalServiceTime,
      totalTime: totalTravelTime + totalServiceTime,
    };
  }, [optimizedRoute, routeStops]);

  // Simular optimización de ruta (en producción usaría Google Directions API)
  const optimizeRoute = async () => {
    setIsOptimizing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Simular cálculo de tiempos (en producción se usaría la API de Google)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const optimized = routeStops.map((stop, index) => {
        // Estimaciones simuladas basadas en posición
        const baseTime = 15 + Math.random() * 20; // 15-35 min entre visitas
        const baseDistance = 5 + Math.random() * 15; // 5-20 km entre visitas
        
        // Calcular hora estimada de llegada
        let estimatedArrival = stop.appointment.startTime;
        if (index > 0) {
          const prevStop = routeStops[index - 1];
          const prevEndTime = addMinutes(prevStop.appointment.startTime, prevStop.appointment.estimatedDuration || 60);
          estimatedArrival = addMinutes(prevEndTime, Math.round(baseTime));
        }

        return {
          ...stop,
          travelTime: index === 0 ? 0 : Math.round(baseTime),
          distance: index === 0 ? 0 : Math.round(baseDistance * 10) / 10,
          estimatedArrival,
        };
      });

      setOptimizedRoute(optimized);
    } catch (error) {
      Alert.alert('Error', 'No se pudo calcular la ruta optimizada');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Abrir Google Maps con todas las paradas
  const openFullRoute = () => {
    const validAddresses = routeStops
      .filter(stop => stop.address)
      .map(stop => encodeURIComponent(stop.address));

    if (validAddresses.length === 0) {
      Alert.alert('Sin direcciones', 'Ninguna cita tiene dirección válida para navegar.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Google Maps con múltiples waypoints
    const destination = validAddresses[validAddresses.length - 1];
    const waypoints = validAddresses.slice(0, -1).join('|');
    
    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    if (waypoints) {
      mapsUrl += `&waypoints=${waypoints}`;
    }
    mapsUrl += '&travelmode=driving';

    Linking.openURL(mapsUrl);
  };

  // Abrir Google Maps para una parada específica
  const openSingleRoute = (stop: RouteStop) => {
    if (!stop.address) {
      Alert.alert('Sin dirección', 'Este cliente no tiene dirección registrada.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`;
    Linking.openURL(mapsUrl);
  };

  // Función auxiliar para sumar minutos a una hora
  const addMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  if (routeStops.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="map.fill" size={20} color={accent} />
          <ThemedText style={styles.title}>Ruta del día</ThemedText>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.optimizeButton, { backgroundColor: `${accent}15` }]}
            onPress={optimizeRoute}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <>
                <IconSymbol name="arrow.triangle.swap" size={16} color={accent} />
                <ThemedText style={[styles.optimizeText, { color: accent }]}>
                  Optimizar
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Estadísticas de ruta */}
      {totalStats && (
        <View style={[styles.statsRow, { borderColor }]}>
          <View style={styles.statItem}>
            <IconSymbol name="clock" size={14} color={textSecondary} />
            <ThemedText style={[styles.statText, { color: textSecondary }]}>
              {Math.round(totalStats.totalTime / 60)}h {totalStats.totalTime % 60}min total
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <IconSymbol name="car" size={14} color={textSecondary} />
            <ThemedText style={[styles.statText, { color: textSecondary }]}>
              {totalStats.distance.toFixed(1)} km
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <IconSymbol name="mappin" size={14} color={textSecondary} />
            <ThemedText style={[styles.statText, { color: textSecondary }]}>
              {routeStops.length} paradas
            </ThemedText>
          </View>
        </View>
      )}

      {/* Lista de paradas */}
      <View style={styles.stopsList}>
        {(optimizedRoute || routeStops).map((stop, index) => (
          <View key={stop.appointment.id}>
            {/* Línea de conexión y tiempo de viaje */}
            {index > 0 && (
              <View style={styles.connectionRow}>
                <View style={[styles.connectionLine, { backgroundColor: borderColor }]} />
                {stop.travelTime !== undefined && (
                  <View style={[styles.travelInfo, { backgroundColor: `${warning}15` }]}>
                    <IconSymbol name="car" size={12} color={warning} />
                    <ThemedText style={[styles.travelText, { color: warning }]}>
                      {stop.travelTime} min · {stop.distance} km
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* Parada */}
            <Pressable
              style={styles.stopCard}
              onPress={() => onAppointmentPress?.(stop.appointment)}
            >
              <View style={[styles.stopNumber, { backgroundColor: accent }]}>
                <ThemedText style={styles.stopNumberText}>{index + 1}</ThemedText>
              </View>

              <View style={styles.stopContent}>
                <View style={styles.stopHeader}>
                  <ThemedText style={styles.stopTime}>
                    {stop.estimatedArrival || stop.appointment.startTime}
                  </ThemedText>
                  {stop.estimatedArrival && stop.estimatedArrival !== stop.appointment.startTime && (
                    <ThemedText style={[styles.originalTime, { color: textSecondary }]}>
                      (programada: {stop.appointment.startTime})
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.clientName} numberOfLines={1}>
                  {stop.client ? getClientFullName(stop.client) : 'Cliente'}
                </ThemedText>
                {stop.address ? (
                  <ThemedText style={[styles.addressText, { color: textSecondary }]} numberOfLines={2}>
                    {stop.address}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.noAddress, { color: warning }]}>
                    Sin dirección registrada
                  </ThemedText>
                )}
              </View>

              <Pressable
                style={[styles.navButton, { backgroundColor: '#4285F4' }]}
                onPress={() => openSingleRoute(stop)}
                disabled={!stop.address}
              >
                <IconSymbol name="location.fill" size={16} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          </View>
        ))}
      </View>

      {/* Botón para abrir ruta completa */}
      <Pressable
        style={[styles.fullRouteButton, { backgroundColor: '#4285F4' }]}
        onPress={openFullRoute}
      >
        <IconSymbol name="map.fill" size={18} color="#FFFFFF" />
        <ThemedText style={styles.fullRouteText}>
          Abrir ruta completa en Google Maps
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  optimizeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  stopsList: {
    gap: 0,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    height: 40,
  },
  connectionLine: {
    width: 2,
    height: '100%',
    marginRight: Spacing.md,
  },
  travelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  travelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stopContent: {
    flex: 1,
    gap: 2,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stopTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  originalTime: {
    fontSize: 11,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 12,
  },
  noAddress: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 4,
  },
  fullRouteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RouteOptimizer;
