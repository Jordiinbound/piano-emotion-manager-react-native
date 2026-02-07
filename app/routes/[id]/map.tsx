/**
 * Mapa de Ruta
 * Piano Emotion Manager
 * 
 * Visualización de clientes en Google Maps para una ruta específica
 */

import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { trpc } from '@/utils/trpc';
import { useClientsData } from '@/hooks/data';
import { optimizeRoute, calculateTotalDistance, estimateTravelTime, formatTravelTime } from '@/utils/route-optimizer';

// Paleta de colores
const COLORS = {
  primary: '#003a8c',
  background: '#ffffff',
  surface: '#f8f9fa',
  border: '#e5e7eb',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  accent: '#e07a5f',
  success: '#10b981',
  error: '#ef4444',
};

export default function RouteMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [optimizedClients, setOptimizedClients] = useState<any[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);
  const mapRef = useRef<any>(null);

  // Queries
  const { data: route, isLoading: loadingRoute } = trpc.routes.getById.useQuery({ id: parseInt(id) });
  const { clients, loading: loadingClients } = useClientsData();

  // Filtrar clientes de esta ruta
  const routeClients = clients.filter((c: any) => 
    c.routeId === parseInt(id) || c.routeGroup === route?.name
  );

  // Clientes con coordenadas
  const clientsWithCoords = routeClients.filter((c: any) => 
    c.latitude && c.longitude
  );

  // Lista de clientes a mostrar (optimizada o no)
  const displayClients = isOptimized && optimizedClients.length > 0 ? optimizedClients : routeClients;

  // Calcular estadísticas de distancia y tiempo
  const totalDistance = isOptimized && optimizedClients.length > 0 
    ? calculateTotalDistance(optimizedClients)
    : 0;
  const estimatedTime = totalDistance > 0 ? estimateTravelTime(totalDistance) : 0;

  const handleOptimizeRoute = () => {
    if (clientsWithCoords.length < 2) {
      Alert.alert('Error', 'Se necesitan al menos 2 clientes con ubicación para optimizar');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimizar usando algoritmo nearest neighbor
    const optimized = optimizeRoute(clientsWithCoords);
    setOptimizedClients(optimized);
    setIsOptimized(true);

    Alert.alert(
      'Ruta optimizada',
      `Distancia total: ${totalDistance.toFixed(1)} km\nTiempo estimado: ${formatTravelTime(estimatedTime)}`,
      [{ text: 'OK' }]
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetOptimization = () => {
    setIsOptimized(false);
    setOptimizedClients([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExportPDF = async () => {
    if (clientsWithCoords.length === 0) {
      Alert.alert('Error', 'No hay clientes con ubicación en esta ruta');
      return;
    }

    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Generar HTML para PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ruta: ${route?.name}</title>
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 40px;
              color: #1a1a1a;
            }
            h1 {
              color: ${route?.color || COLORS.accent};
              margin-bottom: 10px;
            }
            .subtitle {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 30px;
            }
            .stats {
              display: flex;
              gap: 20px;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .stat {
              flex: 1;
            }
            .stat-value {
              font-size: 24px;
              font-weight: bold;
              color: ${route?.color || COLORS.accent};
            }
            .stat-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #f8f9fa;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              color: #6b7280;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .client-name {
              font-weight: 600;
              color: #1a1a1a;
            }
            .client-address {
              color: #6b7280;
              font-size: 13px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>Ruta: ${route?.name}</h1>
          <div class="subtitle">
            ${route?.description || 'Ruta de trabajo'}
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-value">${routeClients.length}</div>
              <div class="stat-label">Clientes totales</div>
            </div>
            <div class="stat">
              <div class="stat-value">${clientsWithCoords.length}</div>
              <div class="stat-label">Con ubicación</div>
            </div>
            <div class="stat">
              <div class="stat-value">${routeClients.length - clientsWithCoords.length}</div>
              <div class="stat-label">Sin ubicación</div>
            </div>
          </div>

          <h2>Lista de Clientes</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              ${routeClients.map((client: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div class="client-name">${client.firstName || ''} ${client.lastName1 || ''}</div>
                  </td>
                  <td>${client.phone || '-'}</td>
                  <td>
                    <div class="client-address">
                      ${client.address?.street || ''} ${client.address?.number || ''}
                      ${client.address?.city ? `, ${client.address.city}` : ''}
                      ${client.address?.postalCode ? ` (${client.address.postalCode})` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generado el ${new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} | Piano Emotion Manager
          </div>
        </body>
        </html>
      `;

      // Generar PDF
      const { uri } = await Print.printToFileAsync({ html });

      // Compartir PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Ruta: ${route?.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Éxito', 'PDF generado correctamente');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExporting(false);
    }
  };

  if (loadingRoute || loadingClients) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Mapa de Ruta',
            headerBackTitle: 'Atrás',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!route) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Mapa de Ruta',
            headerBackTitle: 'Atrás',
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol name="exclamationmark.triangle" size={64} color={COLORS.error} />
          <ThemedText style={styles.emptyTitle}>Ruta no encontrada</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: `Mapa: ${route.name}`,
          headerBackTitle: 'Atrás',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.routeInfo}>
              <View style={[styles.colorDot, { backgroundColor: route.color }]} />
              <View>
                <ThemedText style={styles.routeName}>{route.name}</ThemedText>
                {route.description && (
                  <ThemedText style={styles.routeDescription}>{route.description}</ThemedText>
                )}
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statValue, { color: route.color }]}>
                {routeClients.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Clientes</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statValue, { color: COLORS.success }]}>
                {clientsWithCoords.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Con ubicación</ThemedText>
            </View>
            {isOptimized ? (
              <>
                <View style={styles.statCard}>
                  <ThemedText style={[styles.statValue, { color: COLORS.accent }]}>
                    {totalDistance.toFixed(1)} km
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Distancia</ThemedText>
                </View>
                <View style={styles.statCard}>
                  <ThemedText style={[styles.statValue, { color: COLORS.primary }]}>
                    {formatTravelTime(estimatedTime)}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Tiempo est.</ThemedText>
                </View>
              </>
            ) : (
              <View style={styles.statCard}>
                <ThemedText style={[styles.statValue, { color: COLORS.textTertiary }]}>
                  {routeClients.length - clientsWithCoords.length}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Sin ubicación</ThemedText>
              </View>
            )}
          </View>

          {/* Botón de optimización */}
          {clientsWithCoords.length >= 2 && (
            <View style={styles.optimizeButtonContainer}>
              {isOptimized ? (
                <Pressable style={styles.resetButton} onPress={handleResetOptimization}>
                  <IconSymbol name="arrow.counterclockwise" size={16} color={COLORS.textSecondary} />
                  <ThemedText style={styles.resetButtonText}>Restablecer orden</ThemedText>
                </Pressable>
              ) : (
                <Pressable style={styles.optimizeButton} onPress={handleOptimizeRoute}>
                  <IconSymbol name="arrow.triangle.2.circlepath" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.optimizeButtonText}>Optimizar ruta</ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Mapa de Google */}
        <View style={styles.mapContainer}>
          {clientsWithCoords.length > 0 ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: clientsWithCoords[0].latitude,
                longitude: clientsWithCoords[0].longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
              onMapReady={() => {
                setMapLoaded(true);
                // Auto-ajustar para mostrar todos los markers
                if (mapRef.current && clientsWithCoords.length > 1) {
                  const coordinates = clientsWithCoords.map((c: any) => ({
                    latitude: c.latitude,
                    longitude: c.longitude,
                  }));
                  mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                  });
                }
              }}
            >
              {clientsWithCoords.map((client: any) => (
                <Marker
                  key={client.id}
                  coordinate={{
                    latitude: client.latitude,
                    longitude: client.longitude,
                  }}
                  title={`${client.firstName || ''} ${client.lastName1 || ''}`}
                  description={client.address?.street ? `${client.address.street} ${client.address.number || ''}` : 'Sin dirección'}
                  pinColor={client.isVip ? '#FFD700' : route.color}
                  onCalloutPress={() => router.push(`/client/${client.id}`)}
                />
              ))}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <IconSymbol name="map.fill" size={64} color={COLORS.textTertiary} />
              <ThemedText style={styles.mapPlaceholderText}>
                No hay clientes con ubicación
              </ThemedText>
              <ThemedText style={styles.mapPlaceholderSubtext}>
                Añade coordenadas a los clientes para verlos en el mapa
              </ThemedText>
            </View>
          )}
        </View>

        {/* Lista de clientes */}
        <View style={styles.clientsList}>
          <ThemedText style={styles.sectionTitle}>Clientes en esta ruta</ThemedText>
          {routeClients.length === 0 ? (
            <View style={styles.emptyList}>
              <IconSymbol name="person.2" size={48} color={COLORS.textTertiary} />
              <ThemedText style={styles.emptyListText}>
                No hay clientes asignados a esta ruta
              </ThemedText>
            </View>
          ) : (
            displayClients.map((client: any, index: number) => (
              <Pressable
                key={client.id}
                style={styles.clientCard}
                onPress={() => router.push(`/client/${client.id}`)}
              >
                <View style={styles.clientNumber}>
                  <ThemedText style={styles.clientNumberText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.clientInfo}>
                  <ThemedText style={styles.clientName}>
                    {client.firstName || ''} {client.lastName1 || ''}
                  </ThemedText>
                  {client.address?.street && (
                    <ThemedText style={styles.clientAddress}>
                      {client.address.street} {client.address.number}
                      {client.address.city && `, ${client.address.city}`}
                    </ThemedText>
                  )}
                  {client.phone && (
                    <ThemedText style={styles.clientPhone}>{client.phone}</ThemedText>
                  )}
                </View>
                {client.latitude && client.longitude ? (
                  <IconSymbol name="mappin.circle.fill" size={20} color={COLORS.success} />
                ) : (
                  <IconSymbol name="mappin.slash" size={20} color={COLORS.textTertiary} />
                )}
              </Pressable>
            ))
          )}
        </View>

        {/* Botón exportar */}
        {routeClients.length > 0 && (
          <Pressable
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="arrow.down.doc.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.exportButtonText}>Exportar a PDF</ThemedText>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    marginBottom: Spacing.md,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 2,
  },
  routeName: {
    fontSize: 24,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  routeDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Montserrat',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  mapContainer: {
    height: 300,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: Spacing.md,
  },
  mapPlaceholderSubtext: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  clientsList: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyList: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: Spacing.sm,
  },
  clientNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientNumberText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: COLORS.textTertiary,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 15,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optimizeButtonContainer: {
    marginTop: Spacing.md,
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  optimizeButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
