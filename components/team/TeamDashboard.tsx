/**
 * Dashboard de Administración del Equipo
 * Piano Emotion Manager
 * 
 * Panel de control para administradores y managers con métricas
 * y estadísticas del equipo de técnicos.
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

export interface TechnicianMetrics {
  memberId: number;
  displayName: string;
  color: string;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  servicesCompleted: number;
  totalWorkMinutes: number;
  totalRevenue: number;
  averageRating: number;
  ratingsCount: number;
  onTimeArrivals: number;
  lateArrivals: number;
}

export interface OrganizationStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  totalAppointmentsToday: number;
  completedToday: number;
  pendingToday: number;
  totalRevenueMonth: number;
  totalServicesMonth: number;
  averageRatingMonth: number;
}

interface TeamDashboardProps {
  organizationName: string;
  stats: OrganizationStats;
  technicianMetrics: TechnicianMetrics[];
  period: 'day' | 'week' | 'month';
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
  onTechnicianPress: (memberId: number) => void;
  onViewCalendar: () => void;
  onManageTeam: () => void;
}

// ==========================================
// CONSTANTES
// ==========================================

const PERIODS = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function TeamDashboard({
  organizationName,
  stats,
  technicianMetrics,
  period,
  onPeriodChange,
  onTechnicianPress,
  onViewCalendar,
  onManageTeam,
}: TeamDashboardProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  
  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    const totalRevenue = technicianMetrics.reduce((sum, t) => sum + t.totalRevenue, 0);
    const totalServices = technicianMetrics.reduce((sum, t) => sum + t.servicesCompleted, 0);
    const totalWorkHours = technicianMetrics.reduce((sum, t) => sum + t.totalWorkMinutes, 0) / 60;
    const avgRating = technicianMetrics.length > 0
      ? technicianMetrics.reduce((sum, t) => sum + t.averageRating * t.ratingsCount, 0) /
        technicianMetrics.reduce((sum, t) => sum + t.ratingsCount, 0)
      : 0;
    
    return { totalRevenue, totalServices, totalWorkHours, avgRating };
  }, [technicianMetrics]);
  
  // Ordenar técnicos por rendimiento
  const sortedTechnicians = useMemo(() => {
    return [...technicianMetrics].sort((a, b) => b.servicesCompleted - a.servicesCompleted);
  }, [technicianMetrics]);
  
  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.welcomeText}>Panel de Control</Text>
          <Text style={styles.orgName}>{organizationName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={onViewCalendar}>
            <Ionicons name="calendar-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={onManageTeam}>
            <Ionicons name="people-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Selector de período */}
      <View style={styles.periodSelector}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodButton,
              { backgroundColor: period === p.value ? colors.primary : colors.card },
            ]}
            onPress={() => onPeriodChange(p.value as any)}
          >
            <Text
              style={[
                styles.periodButtonText,
                { color: period === p.value ? '#fff' : colors.text },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Tarjetas de resumen */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="people" size={24} color="#3b82f6" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {stats.activeMembers}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Técnicos Activos
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryIcon, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {stats.completedToday}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Completados Hoy
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryIcon, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="time" size={24} color="#f59e0b" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {stats.pendingToday}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Pendientes Hoy
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={[styles.summaryIcon, { backgroundColor: '#8b5cf620' }]}>
            <Ionicons name="mail" size={24} color="#8b5cf6" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {stats.pendingInvitations}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Invitaciones
          </Text>
        </View>
      </View>
      
      {/* Métricas del período */}
      <View style={[styles.metricsSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Métricas del {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}
        </Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              €{aggregatedMetrics.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Facturación
            </Text>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#22c55e' }]}>
              {aggregatedMetrics.totalServices}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Servicios
            </Text>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>
              {aggregatedMetrics.totalWorkHours.toFixed(1)}h
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Horas Trabajo
            </Text>
          </View>
          
          <View style={styles.metricItem}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {aggregatedMetrics.avgRating.toFixed(1)}
              </Text>
            </View>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Valoración Media
            </Text>
          </View>
        </View>
      </View>
      
      {/* Ranking de técnicos */}
      <View style={[styles.rankingSection, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rendimiento del Equipo
          </Text>
          <TouchableOpacity onPress={onManageTeam}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        {sortedTechnicians.slice(0, 5).map((tech, index) => (
          <TouchableOpacity
            key={tech.memberId}
            style={styles.technicianRow}
            onPress={() => onTechnicianPress(tech.memberId)}
          >
            {/* Posición */}
            <View style={[styles.rankBadge, { backgroundColor: getRankColor(index) }]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            
            {/* Avatar */}
            <View style={[styles.techAvatar, { backgroundColor: tech.color }]}>
              <Text style={styles.techInitial}>
                {tech.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            {/* Info */}
            <View style={styles.techInfo}>
              <Text style={[styles.techName, { color: colors.text }]}>
                {tech.displayName}
              </Text>
              <View style={styles.techStats}>
                <View style={styles.techStat}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text style={[styles.techStatText, { color: colors.textSecondary }]}>
                    {tech.servicesCompleted}
                  </Text>
                </View>
                <View style={styles.techStat}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={[styles.techStatText, { color: colors.textSecondary }]}>
                    {tech.averageRating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.techStat}>
                  <Ionicons name="cash" size={14} color="#22c55e" />
                  <Text style={[styles.techStatText, { color: colors.textSecondary }]}>
                    €{tech.totalRevenue.toLocaleString('es-ES')}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Puntualidad */}
            <View style={styles.punctualityContainer}>
              <Text
                style={[
                  styles.punctualityText,
                  {
                    color: getPunctualityColor(
                      tech.onTimeArrivals,
                      tech.onTimeArrivals + tech.lateArrivals
                    ),
                  },
                ]}
              >
                {tech.onTimeArrivals + tech.lateArrivals > 0
                  ? `${Math.round(
                      (tech.onTimeArrivals / (tech.onTimeArrivals + tech.lateArrivals)) * 100
                    )}%`
                  : '-'}
              </Text>
              <Text style={[styles.punctualityLabel, { color: colors.textSecondary }]}>
                Puntual
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {sortedTechnicians.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay datos de rendimiento disponibles
            </Text>
          </View>
        )}
      </View>
      
      {/* Alertas y notificaciones */}
      <View style={[styles.alertsSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Alertas
        </Text>
        
        {stats.pendingInvitations > 0 && (
          <View style={[styles.alertItem, { borderLeftColor: '#8b5cf6' }]}>
            <Ionicons name="mail-outline" size={20} color="#8b5cf6" />
            <Text style={[styles.alertText, { color: colors.text }]}>
              {stats.pendingInvitations} invitación(es) pendiente(s) de aceptar
            </Text>
          </View>
        )}
        
        {stats.pendingToday > 0 && (
          <View style={[styles.alertItem, { borderLeftColor: '#f59e0b' }]}>
            <Ionicons name="time-outline" size={20} color="#f59e0b" />
            <Text style={[styles.alertText, { color: colors.text }]}>
              {stats.pendingToday} trabajo(s) pendiente(s) para hoy
            </Text>
          </View>
        )}
        
        {sortedTechnicians.some(t => t.lateArrivals > t.onTimeArrivals) && (
          <View style={[styles.alertItem, { borderLeftColor: '#ef4444' }]}>
            <Ionicons name="warning-outline" size={20} color="#ef4444" />
            <Text style={[styles.alertText, { color: colors.text }]}>
              Algunos técnicos tienen problemas de puntualidad
            </Text>
          </View>
        )}
        
        {stats.pendingInvitations === 0 && stats.pendingToday === 0 && (
          <View style={[styles.alertItem, { borderLeftColor: '#22c55e' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
            <Text style={[styles.alertText, { color: colors.text }]}>
              Todo en orden. No hay alertas pendientes.
            </Text>
          </View>
        )}
      </View>
      
      {/* Espacio inferior */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function getRankColor(index: number): string {
  switch (index) {
    case 0:
      return '#f59e0b'; // Oro
    case 1:
      return '#9ca3af'; // Plata
    case 2:
      return '#b45309'; // Bronce
    default:
      return '#6b7280';
  }
}

function getPunctualityColor(onTime: number, total: number): string {
  if (total === 0) return '#6b7280';
  const percentage = (onTime / total) * 100;
  if (percentage >= 90) return '#22c55e';
  if (percentage >= 75) return '#f59e0b';
  return '#ef4444';
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  orgName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  periodButtonText: {
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  summaryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsSection: {
    margin: 16,
    padding: 16,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 4,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  techAvatar: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  techInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  techInfo: {
    flex: 1,
  },
  techName: {
    fontSize: 15,
    fontWeight: '600',
  },
  techStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  techStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  techStatText: {
    fontSize: 12,
  },
  punctualityContainer: {
    alignItems: 'center',
  },
  punctualityText: {
    fontSize: 16,
    fontWeight: '700',
  },
  punctualityLabel: {
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  alertsSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 4,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 4,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default TeamDashboard;
