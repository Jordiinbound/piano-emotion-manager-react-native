/**
 * Dashboard Mejorado con Herramientas Avanzadas
 * Piano Emotion Manager
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
// import { useMyPermissions } from '@/hooks/team'; // Deshabilitado temporalmente
import { useQuickStats } from '@/hooks/accounting';
import { useModuleAccess } from '@/hooks/modules';

// ============================================================================
// Types
// ============================================================================

interface ToolCard {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  bgColor: string;
  route: string;
  requiredModule?: string;
  requiredPermission?: string;
  badge?: number;
}

// ============================================================================
// Tool Cards Configuration
// ============================================================================

const toolCards: ToolCard[] = [
  // Herramientas principales
  {
    id: 'calendar',
    titleKey: 'dashboard.tools.calendar',
    descriptionKey: 'dashboard.tools.calendarDesc',
    icon: 'calendar',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    route: '/calendar',
  },
  {
    id: 'clients',
    titleKey: 'dashboard.tools.clients',
    descriptionKey: 'dashboard.tools.clientsDesc',
    icon: 'people',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    route: '/crm',
  },
  {
    id: 'pianos',
    titleKey: 'dashboard.tools.pianos',
    descriptionKey: 'dashboard.tools.pianosDesc',
    icon: 'musical-notes',
    color: '#ec4899',
    bgColor: '#fce7f3',
    route: '/pianos',
  },
  {
    id: 'services',
    titleKey: 'dashboard.tools.services',
    descriptionKey: 'dashboard.tools.servicesDesc',
    icon: 'construct',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    route: '/services',
  },
  // Herramientas avanzadas
  {
    id: 'team',
    titleKey: 'dashboard.tools.team',
    descriptionKey: 'dashboard.tools.teamDesc',
    icon: 'people-circle',
    color: '#10b981',
    bgColor: '#d1fae5',
    route: '/team',
    requiredModule: 'team_management',
    requiredPermission: 'team.view',
  },
  {
    id: 'inventory',
    titleKey: 'dashboard.tools.inventory',
    descriptionKey: 'dashboard.tools.inventoryDesc',
    icon: 'cube',
    color: '#6366f1',
    bgColor: '#e0e7ff',
    route: '/inventory',
    requiredModule: 'inventory',
  },
  {
    id: 'invoicing',
    titleKey: 'dashboard.tools.invoicing',
    descriptionKey: 'dashboard.tools.invoicingDesc',
    icon: 'document-text',
    color: '#14b8a6',
    bgColor: '#ccfbf1',
    route: '/invoices',
  },
  {
    id: 'accounting',
    titleKey: 'dashboard.tools.accounting',
    descriptionKey: 'dashboard.tools.accountingDesc',
    icon: 'calculator',
    color: '#f97316',
    bgColor: '#ffedd5',
    route: '/accounting',
    requiredModule: 'accounting',
  },
  {
    id: 'reports',
    titleKey: 'dashboard.tools.reports',
    descriptionKey: 'dashboard.tools.reportsDesc',
    icon: 'analytics',
    color: '#06b6d4',
    bgColor: '#cffafe',
    route: '/reports',
    requiredModule: 'reports',
  },
  {
    id: 'shop',
    titleKey: 'dashboard.tools.shop',
    descriptionKey: 'dashboard.tools.shopDesc',
    icon: 'cart',
    color: '#84cc16',
    bgColor: '#ecfccb',
    route: '/shop',
    // Tienda disponible para todos - es canal de marketing
  },
];

// ============================================================================
// Quick Stats Component
// ============================================================================

const QuickStatsSection: React.FC = () => {
  const { t } = useTranslation();
  const { monthlyIncome, monthlyExpenses, monthlyProfit, isLoading } = useQuickStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>{t('dashboard.monthlyOverview')}</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Ionicons name="trending-up" size={20} color="#059669" />
          <Text style={styles.statLabel}>{t('dashboard.income')}</Text>
          <Text style={[styles.statValue, { color: '#059669' }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </View>
        <View style={[styles.statCard, styles.expenseCard]}>
          <Ionicons name="trending-down" size={20} color="#dc2626" />
          <Text style={styles.statLabel}>{t('dashboard.expenses')}</Text>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>
            {formatCurrency(monthlyExpenses)}
          </Text>
        </View>
        <View style={[styles.statCard, styles.profitCard]}>
          <Ionicons name="wallet" size={20} color="#3b82f6" />
          <Text style={styles.statLabel}>{t('dashboard.profit')}</Text>
          <Text style={[styles.statValue, { color: monthlyProfit >= 0 ? '#059669' : '#dc2626' }]}>
            {formatCurrency(monthlyProfit)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// Tool Card Component
// ============================================================================

interface ToolCardComponentProps {
  tool: ToolCard;
  onPress: () => void;
  isLocked: boolean;
  isPremium: boolean;
}

const ToolCardComponent: React.FC<ToolCardComponentProps> = ({
  tool,
  onPress,
  isLocked,
  isPremium,
}) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.toolCard, isLocked && styles.toolCardLocked]}
      onPress={onPress}
      disabled={isLocked}
    >
      <View style={[styles.toolIconContainer, { backgroundColor: tool.bgColor }]}>
        <Ionicons name={tool.icon as any} size={28} color={tool.color} />
        {isPremium && !isLocked && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#fff" />
          </View>
        )}
        {isLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.toolTitle, isLocked && styles.toolTitleLocked]}>
        {t(tool.titleKey)}
      </Text>
      <Text style={[styles.toolDescription, isLocked && styles.toolDescriptionLocked]} numberOfLines={2}>
        {t(tool.descriptionKey)}
      </Text>
      {tool.badge && tool.badge > 0 && (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>{tool.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Upcoming Tasks Component
// ============================================================================

const UpcomingTasksSection: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  // Mock data - en producción vendría de un hook
  const upcomingTasks = [
    { id: 1, title: 'Afinación - Piano Yamaha U3', client: 'María García', time: '10:00', type: 'tuning' },
    { id: 2, title: 'Reparación mecánica', client: 'Carlos López', time: '14:30', type: 'repair' },
    { id: 3, title: 'Regulación completa', client: 'Ana Martínez', time: '17:00', type: 'regulation' },
  ];

  const typeColors: Record<string, string> = {
    tuning: '#3b82f6',
    repair: '#ef4444',
    regulation: '#f59e0b',
    cleaning: '#10b981',
  };

  return (
    <View style={styles.tasksSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('dashboard.todayTasks')}</Text>
        <TouchableOpacity onPress={() => router.push('/calendar')}>
          <Text style={styles.seeAllLink}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>
      {upcomingTasks.map((task) => (
        <TouchableOpacity key={task.id} style={styles.taskCard}>
          <View style={[styles.taskIndicator, { backgroundColor: typeColors[task.type] }]} />
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskClient}>{task.client}</Text>
          </View>
          <View style={styles.taskTime}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.taskTimeText}>{task.time}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EnhancedDashboard: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  // Simplificado: verificar permisos sin organización específica
  const hasPermission = (permission: string) => {
    // Verificar permisos basados en el rol del usuario y su plan de suscripción
    const userPlan = user?.subscriptionPlan || 'free';
    const userRole = user?.role || 'user';
    
    // Permisos por plan
    const planPermissions: Record<string, string[]> = {
      free: ['view_dashboard', 'view_clients', 'view_pianos', 'view_services'],
      premium: ['view_dashboard', 'view_clients', 'view_pianos', 'view_services', 'view_analytics', 'view_reports', 'export_data'],
      enterprise: ['view_dashboard', 'view_clients', 'view_pianos', 'view_services', 'view_analytics', 'view_reports', 'export_data', 'manage_team', 'api_access'],
    };
    
    // Permisos por rol
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      manager: ['manage_team', 'view_all_data'],
      user: [],
    };
    
    // Verificar si tiene el permiso
    const userPlanPerms = planPermissions[userPlan] || [];
    const userRolePerms = rolePermissions[userRole] || [];
    
    if (userRolePerms.includes('*')) return true;
    return userPlanPerms.includes(permission) || userRolePerms.includes(permission);
  };
  const { hasModuleAccess, isPremiumModule } = useModuleAccess();

  const handleToolPress = (tool: ToolCard) => {
    router.push(tool.route as any);
  };

  const isToolLocked = (tool: ToolCard): boolean => {
    // Verificar acceso al módulo
    if (tool.requiredModule && !hasModuleAccess(tool.requiredModule)) {
      return true;
    }
    // Verificar permiso
    if (tool.requiredPermission && !hasPermission(tool.requiredPermission)) {
      return true;
    }
    return false;
  };

  const isToolPremium = (tool: ToolCard): boolean => {
    return tool.requiredModule ? isPremiumModule(tool.requiredModule) : false;
  };

  // Separar herramientas principales y avanzadas
  const mainTools = toolCards.filter((t) => !t.requiredModule);
  const advancedTools = toolCards.filter((t) => t.requiredModule);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header con saludo */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('dashboard.greeting')}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* Estadísticas rápidas */}
      <QuickStatsSection />

      {/* Tareas del día */}
      <UpcomingTasksSection />

      {/* Herramientas principales */}
      <View style={styles.toolsSection}>
        <Text style={styles.sectionTitle}>{t('dashboard.mainTools')}</Text>
        <View style={styles.toolsGrid}>
          {mainTools.map((tool) => (
            <ToolCardComponent
              key={tool.id}
              tool={tool}
              onPress={() => handleToolPress(tool)}
              isLocked={isToolLocked(tool)}
              isPremium={isToolPremium(tool)}
            />
          ))}
        </View>
      </View>

      {/* Herramientas avanzadas */}
      <View style={styles.toolsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.advancedTools')}</Text>
          <View style={styles.premiumIndicator}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        </View>
        <View style={styles.toolsGrid}>
          {advancedTools.map((tool) => (
            <ToolCardComponent
              key={tool.id}
              tool={tool}
              onPress={() => handleToolPress(tool)}
              isLocked={isToolLocked(tool)}
              isPremium={isToolPremium(tool)}
            />
          ))}
        </View>
      </View>

      {/* Espacio inferior */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  // Stats Section
  statsSection: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  incomeCard: {
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  expenseCard: {
    borderTopWidth: 3,
    borderTopColor: '#ef4444',
  },
  profitCard: {
    borderTopWidth: 3,
    borderTopColor: '#3b82f6',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  // Tasks Section
  tasksSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  taskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskClient: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  taskTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTimeText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Tools Section
  toolsSection: {
    padding: 16,
  },
  premiumIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    position: 'relative',
  },
  toolCardLocked: {
    opacity: 0.6,
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  toolTitleLocked: {
    color: '#9ca3af',
  },
  toolDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  toolDescriptionLocked: {
    color: '#d1d5db',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default EnhancedDashboard;
