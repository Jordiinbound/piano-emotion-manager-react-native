/**
 * Dashboard Quick Actions Component
 * Muestra acciones rápidas y accesos a módulos
 */
import { Pressable, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Accordion } from '@/components/accordion';
import { AnimatedCard } from '@/components/animated-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

// Definición de acciones rápidas
const QUICK_ACTIONS = [
  { key: 'new_service', icon: 'plus.circle.fill', label: 'Nuevo Servicio', color: '#C9A227' },
  { key: 'new_client', icon: 'person.badge.plus', label: 'Nuevo Cliente', color: '#3B82F6' },
  { key: 'new_piano', icon: 'pianokeys', label: 'Nuevo Piano', color: '#8B5CF6' },
];

// Definición de módulos principales
const MODULE_ACTIONS = [
  { key: 'clients', icon: 'person.2.fill', label: 'Clientes', color: '#3B82F6' },
  { key: 'pianos', icon: 'pianokeys', label: 'Pianos', color: '#8B5CF6' },
  { key: 'suppliers', icon: 'building.2.fill', label: 'Proveedores', color: '#F97316' },
  { key: 'dashboard', icon: 'chart.pie.fill', label: 'Panel Control', color: '#2D5A27' },
  { key: 'inventory', icon: 'shippingbox.fill', label: 'Inventario', color: '#F59E0B' },
  { key: 'stats', icon: 'chart.bar.fill', label: 'Estadísticas', color: '#10B981' },
  { key: 'quotes', icon: 'doc.plaintext', label: 'Presupuestos', color: '#9333EA' },
  { key: 'invoices', icon: 'doc.text.fill', label: 'Facturas', color: '#3B82F6' },
  { key: 'billing_summary', icon: 'dollarsign.circle.fill', label: 'Resumen Fact.', color: '#059669' },
  { key: 'rates', icon: 'list.bullet', label: 'Tarifas', color: '#EC4899' },
  { key: 'service_catalog', icon: 'list.clipboard.fill', label: 'Catálogo Serv.', color: '#7C3AED' },
  { key: 'clients_map', icon: 'map.fill', label: 'Mapa Clientes', color: '#DC2626' },
  { key: 'business', icon: 'person.fill', label: 'Datos Fiscales', color: '#6B7280' },
  { key: 'reminders', icon: 'bell.badge.fill', label: 'Recordatorios', color: '#F59E0B' },
  { key: 'contracts', icon: 'doc.badge.clock.fill', label: 'Contratos', color: '#059669' },
  { key: 'predictions', icon: 'brain.head.profile', label: 'Predicciones IA', color: '#8B5CF6' },
  { key: 'import', icon: 'square.and.arrow.down.fill', label: 'Importar', color: '#22C55E' },
  { key: 'routes', icon: 'map.fill', label: 'Rutas', color: '#F97316' },
  { key: 'settings', icon: 'gearshape.fill', label: 'Configuración', color: '#64748B' },
];

// Definición de módulos avanzados (Premium)
const ADVANCED_MODULES = [
  { key: 'team', icon: 'person.3.fill', label: 'Equipos', color: '#10B981', premium: true },
  { key: 'crm', icon: 'heart.fill', label: 'CRM', color: '#EF4444', premium: true },
  { key: 'calendar_adv', icon: 'calendar.badge.clock', label: 'Calendario+', color: '#A855F7', premium: true },
  { key: 'reports', icon: 'chart.pie.fill', label: 'Reportes', color: '#06B6D4', premium: true },
  { key: 'accounting', icon: 'calculator', label: 'Contabilidad', color: '#F97316', premium: true },
  { key: 'shop', icon: 'cart.fill', label: 'Tienda', color: '#84CC16', premium: false },
  { key: 'client_portal', icon: 'globe', label: 'Portal Clientes', color: '#0891B2', premium: true },
  { key: 'distributor', icon: 'building.columns.fill', label: 'Distribuidor', color: '#BE185D', premium: true },
  { key: 'workflows', icon: 'arrow.triangle.branch', label: 'Workflows', color: '#6366F1', premium: true },
  { key: 'marketing', icon: 'megaphone.fill', label: 'Marketing', color: '#E91E63', premium: false },
  { key: 'payments', icon: 'creditcard.fill', label: 'Pasarelas Pago', color: '#635BFF', premium: true },
  { key: 'dashboard_editor', icon: 'square.grid.2x2', label: 'Dashboard+', color: '#EC4899', premium: true },
  { key: 'teams', icon: 'person.3.sequence.fill', label: 'Equipos', color: '#14B8A6', premium: true },
  { key: 'modules', icon: 'creditcard.fill', label: 'Gestionar Plan', color: '#8B5CF6' },
];

// Mapeo de rutas
const ROUTE_MAP: Record<string, string> = {
  new_client: '/client/[id]',
  new_piano: '/piano/[id]',
  new_service: '/service/[id]',
  clients: '/(tabs)/clients',
  pianos: '/(drawer)/pianos',
  inventory: '/(tabs)/inventory',
  stats: '/stats',
  settings: '/settings',
  quotes: '/quotes',
  invoices: '/invoices',
  rates: '/rates',
  business: '/business-info',
  dashboard: '/dashboard',
  suppliers: '/suppliers',
  team: '/(app)/team',
  crm: '/(app)/crm',
  calendar_adv: '/(app)/calendar',
  reports: '/(app)/reports',
  accounting: '/(app)/accounting',
  shop: '/(app)/shop',
  modules: '/settings/modules',
  clients_map: '/clients-map',
  billing_summary: '/billing-summary',
  service_catalog: '/service-catalog',
  service_categories: '/service-categories',
  client_portal: '/portal',
  distributor: '/distributor-panel',
  reminders: '/reminders',
  workflows: '/workflows',
  contracts: '/contracts',
  marketing: '/marketing',
  payments: '/payment-settings',
  dashboard_editor: '/dashboard-editor',
  predictions: '/predictions',
  teams: '/teams',
  import: '/import',
  routes: '/routes',
};

interface DashboardQuickActionsProps {
  urgentCount?: number;
}

export function DashboardQuickActions({ urgentCount = 0 }: DashboardQuickActionsProps) {
  const router = useRouter();
  const accent = useThemeColor({}, 'accent');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const route = ROUTE_MAP[action];
    if (route) {
      if (action.startsWith('new_')) {
        router.push({ pathname: route as any, params: { id: 'new' } });
      } else {
        router.push(route as any);
      }
    }
  };

  return (
    <>
      {/* Acciones rápidas */}
      <Accordion 
        title="Acciones Rápidas" 
        defaultOpen={false}
        icon="bolt.fill"
        iconColor="#C9A227"
      >
        <View style={styles.centeredGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={[styles.quickActionCard, { backgroundColor: cardBg, borderColor }]}
              onPress={() => handleQuickAction(action.key)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <IconSymbol name={action.icon as any} size={28} color={action.color} />
              </View>
              <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Accordion>

      {/* Accesos Rápidos */}
      <Accordion 
        title="Accesos Rápidos" 
        defaultOpen={false}
        icon="square.grid.2x2.fill"
        iconColor="#3B82F6"
        badge={urgentCount > 0 ? urgentCount : undefined}
        badgeColor="#EF4444"
      >
        <View style={styles.centeredGrid}>
          {MODULE_ACTIONS.map((action) => (
            <AnimatedCard
              key={action.key}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => handleQuickAction(action.key)}
            />
          ))}
        </View>
      </Accordion>

      {/* Herramientas Avanzadas (Premium) */}
      <Accordion 
        title="Herramientas Avanzadas" 
        defaultOpen={false}
        icon="star.fill"
        iconColor="#F59E0B"
        badge="PRO"
        badgeColor="#F59E0B"
      >
        <View style={styles.centeredGrid}>
          {ADVANCED_MODULES.map((action) => (
            <AnimatedCard
              key={action.key}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => handleQuickAction(action.key)}
              premium={action.premium}
            />
          ))}
        </View>
      </Accordion>
    </>
  );
}

const styles = StyleSheet.create({
  centeredGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  quickActionCard: {
    width: 100,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
});
