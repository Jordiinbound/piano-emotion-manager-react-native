/**
 * Página Principal de Gestión de Equipo
 * Piano Emotion Manager
 * 
 * Dashboard principal para la gestión del equipo de técnicos.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentOrganization } from '../../../hooks/use-organization';
import { useTeamMembers, useMyPermissions } from '../../../hooks/use-team-members';
import { useWorkAssignments } from '../../../hooks/use-work-assignments';
import { TeamDashboard } from '../../../components/team/TeamDashboard';
import { useTheme } from '../../../hooks/use-theme';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function TeamIndexPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  // Hooks
  const { 
    currentOrganization, 
    currentOrganizationId,
    isLoading: isLoadingOrg 
  } = useCurrentOrganization();
  
  const { 
    members, 
    activeMembers,
    pendingInvitations,
    isLoading: isLoadingMembers,
    refetch: refetchMembers 
  } = useTeamMembers(currentOrganizationId ?? 0);
  
  const {
    dailySchedule,
    isLoading: isLoadingSchedule,
    refetch: refetchSchedule,
  } = useWorkAssignments(currentOrganizationId ?? 0);
  
  const { isAdmin, isManager } = useMyPermissions(currentOrganizationId ?? 0);
  
  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMembers(), refetchSchedule()]);
    setRefreshing(false);
  }, [refetchMembers, refetchSchedule]);
  
  const handleTechnicianPress = useCallback((memberId: number) => {
    router.push(`/team/members/${memberId}`);
  }, [router]);
  
  const handleViewCalendar = useCallback(() => {
    router.push('/team/calendar');
  }, [router]);
  
  const handleManageTeam = useCallback(() => {
    router.push('/team/members');
  }, [router]);
  
  // Loading state
  if (isLoadingOrg || !currentOrganization) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando organización...
        </Text>
      </View>
    );
  }
  
  // No organization state
  if (!currentOrganizationId) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Sin Organización
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Crea una organización para gestionar tu equipo de técnicos.
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/team/create-organization')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Crear Organización</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Calculate stats
  const stats = {
    totalMembers: members.length,
    activeMembers: activeMembers.length,
    pendingInvitations: pendingInvitations.length,
    totalAppointmentsToday: dailySchedule?.technicians.reduce(
      (sum, t) => sum + t.assignments.length, 0
    ) ?? 0,
    completedToday: dailySchedule?.technicians.reduce(
      (sum, t) => sum + t.assignments.filter(a => a.status === 'completed').length, 0
    ) ?? 0,
    pendingToday: dailySchedule?.technicians.reduce(
      (sum, t) => sum + t.assignments.filter(a => 
        ['assigned', 'accepted', 'in_progress'].includes(a.status)
      ).length, 0
    ) ?? 0,
    totalRevenueMonth: teamMembers.reduce((acc: any, m: any) => acc + (m.stats?.revenueMonth || 0), 0),
    totalServicesMonth: teamMembers.reduce((acc: any, m: any) => acc + (m.stats?.servicesMonth || 0), 0),
    averageRatingMonth: teamMembers.length > 0 
      ? teamMembers.reduce((acc: any, m: any) => acc + (m.stats?.averageRating || 0), 0) / teamMembers.length 
      : 0,
  };
  
  // Calculate technician metrics
  const technicianMetrics = activeMembers
    .filter(m => m.canBeAssigned)
    .map(member => {
      const techSchedule = dailySchedule?.technicians.find(t => t.userId === member.userId);
      const assignments = techSchedule?.assignments ?? [];
      
      return {
        memberId: member.id,
        displayName: member.displayName,
        color: member.color,
        appointmentsScheduled: assignments.length,
        appointmentsCompleted: assignments.filter(a => a.status === 'completed').length,
        appointmentsCancelled: assignments.filter(a => a.status === 'cancelled').length,
        servicesCompleted: assignments.filter(a => a.status === 'completed').length,
        totalWorkMinutes: assignments
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + (a.actualDuration ?? a.estimatedDuration ?? 60), 0),
        totalRevenue: member.services?.reduce((acc: number, s: { price?: number }) => acc + (s.price || 0), 0) || 0,
        averageRating: member.ratings?.length > 0 ? member.ratings.reduce((acc: number, r: { value: number }) => acc + r.value, 0) / member.ratings.length : 0,
        ratingsCount: member.ratings?.length || 0,
        onTimeArrivals: member.assignments?.filter((a: { arrivedOnTime: boolean }) => a.arrivedOnTime).length || 0,
        lateArrivals: member.assignments?.filter((a: { arrivedOnTime: boolean }) => !a.arrivedOnTime).length || 0,
      };
    });
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Equipo',
          headerRight: () => (
            <View style={styles.headerRight}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => router.push('/team/settings')}
                >
                  <Ionicons name="settings-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      
      <TeamDashboard
        organizationName={currentOrganization.name}
        stats={stats}
        technicianMetrics={technicianMetrics}
        period={period}
        onPeriodChange={setPeriod}
        onTechnicianPress={handleTechnicianPress}
        onViewCalendar={handleViewCalendar}
        onManageTeam={handleManageTeam}
      />
    </>
  );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
});
