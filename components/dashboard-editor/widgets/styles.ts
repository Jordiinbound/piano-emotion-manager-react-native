/**
 * Estilos compartidos para los widgets del Dashboard Editor
 */

import { StyleSheet } from 'react-native';

export const widgetStyles = StyleSheet.create({
  widgetContent: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
  },
  
  // Alertas
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    marginBottom: 8,
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
  },

  // Acciones rápidas
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Predicciones
  predictionItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  predictionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  predictionTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  predictionSubtitle: {
    fontSize: 11,
  },

  // Estadísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },

  // Listas
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
  },

  // Gráficos
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  periodButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 4,
  },
});
