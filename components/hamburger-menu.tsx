import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Platform, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@clerk/clerk-expo';

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  color: string;
  premium?: boolean;
  section?: string;
}

const MENU_ITEMS: MenuItem[] = [
  // Navegación principal
  { key: 'home', label: 'Inicio', icon: 'house.fill', route: '/', color: '#6366F1' },
  { key: 'clients', label: 'Clientes', icon: 'person.2.fill', route: '/clients', color: '#6366F1' },
  { key: 'pianos', label: 'Pianos', icon: 'pianokeys', route: '/pianos', color: '#10B981' },
  { key: 'services', label: 'Servicios', icon: 'wrench.fill', route: '/services', color: '#F59E0B' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar', route: '/agenda', color: '#EC4899' },
  
  { key: 'divider1', label: '', icon: '', route: '', color: '' },
  
  // Gestión de negocio
  { key: 'section_business', label: 'Gestión de Negocio', icon: '', route: '', color: '', section: 'header' },
  { key: 'invoices', label: 'Facturas', icon: 'doc.text.fill', route: '/invoices', color: '#3B82F6' },
  { key: 'inventory', label: 'Inventario', icon: 'shippingbox.fill', route: '/(app)/inventory', color: '#8B5CF6' },
  { key: 'accounting', label: 'Contabilidad', icon: 'calculator', route: '/accounting', color: '#F97316' },
  { key: 'suppliers', label: 'Proveedores', icon: 'building.2.fill', route: '/suppliers', color: '#F97316' },
  { key: 'shop', label: 'Tienda', icon: 'cart.fill', route: '/(app)/shop', color: '#84CC16' },
  
  { key: 'divider2', label: '', icon: '', route: '', color: '' },
  
  // Herramientas avanzadas
  { key: 'section_tools', label: 'Herramientas Avanzadas', icon: '', route: '', color: '', section: 'header' },
  { key: 'team', label: 'Gestión de Equipos', icon: 'person.3.fill', route: '/(app)/team', color: '#10B981', premium: true },
  { key: 'crm', label: 'CRM Avanzado', icon: 'heart.fill', route: '/(app)/crm', color: '#EF4444', premium: true },
  { key: 'calendar', label: 'Calendario Avanzado', icon: 'calendar.badge.clock', route: '/(app)/calendar', color: '#A855F7', premium: true },
  { key: 'reports', label: 'Reportes y Analytics', icon: 'chart.pie.fill', route: '/(app)/reports', color: '#06B6D4', premium: true },
  
  { key: 'divider3', label: '', icon: '', route: '', color: '' },
  
  // Administración
  { key: 'section_admin', label: 'Administración', icon: '', route: '', color: '', section: 'header' },
  { key: 'admin_alerts', label: 'Configuración Global de Alertas', icon: 'bell.badge.fill', route: '/admin/alerts', color: '#F59E0B' },
  { key: 'admin_alert_history', label: 'Historial de Alertas', icon: 'clock.fill', route: '/admin/alert-history', color: '#8B5CF6' },
  { key: 'admin_help', label: 'Gestión de Ayuda', icon: 'questionmark.circle.fill', route: '/admin/help', color: '#EF4444' },
  
  { key: 'divider4', label: '', icon: '', route: '', color: '' },
  
  // Estadísticas y configuración
  { key: 'section_config', label: 'Configuración', icon: '', route: '', color: '', section: 'header' },
  { key: 'analytics', label: 'Analíticas', icon: 'chart.bar.fill', route: '/analytics', color: '#4A90A4' },
  { key: 'stats', label: 'Estadísticas', icon: 'chart.pie.fill', route: '/stats', color: '#10B981' },
  { key: 'rates', label: 'Tarifas', icon: 'list.bullet', route: '/rates', color: '#EC4899' },
  { key: 'business', label: 'Datos Fiscales', icon: 'person.text.rectangle.fill', route: '/business-info', color: '#6B7280' },
  { key: 'modules', label: 'Módulos y Plan', icon: 'square.grid.2x2.fill', route: '/settings/modules', color: '#8B5CF6' },
  { key: 'settings', label: 'Configuración', icon: 'gearshape.fill', route: '/settings-unified', color: '#64748B' },
  { key: 'help', label: 'Centro de Ayuda', icon: 'questionmark.circle.fill', route: '/help', color: '#0EA5E9' },
];

export function HamburgerMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const { user } = useUser();
  const { isAdmin } = useUserRole();
  
  // Verificar si es admin por rol O por email (fallback)
  const isAdminUser = isAdmin || user?.primaryEmailAddress?.emailAddress === 'jnavarrete@inboundemotion.com';
  
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');

  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    
    // Pequeño delay para cerrar el modal primero
    setTimeout(async () => {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
        if (confirmed) {
          try {
            await logout();
            await AsyncStorage.clear();
            router.replace('/login' as any);
          } catch (err) {
            console.error('Error al cerrar sesión:', err);
          }
        }
      } else {
        Alert.alert(
          'Cerrar Sesión',
          '¿Estás seguro de que quieres cerrar sesión?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Cerrar Sesión',
              style: 'destructive',
              onPress: async () => {
                try {
                  await logout();
                  await AsyncStorage.clear();
                  router.replace('/login' as any);
                } catch (err) {
                  Alert.alert('Error', 'No se pudo cerrar sesión');
                }
              },
            },
          ]
        );
      }
    }, 100);
  }, [router]);

  const handleMenuPress = useCallback((item: MenuItem) => {
    setIsOpen(false);
    // Pequeño delay para que se cierre el menú antes de navegar
    setTimeout(() => {
      router.push(item.route as any);
    }, 100);
  }, [router]);

  const isActiveRoute = useCallback((route: string) => {
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(route);
  }, [pathname]);

  return (
    <>
      {/* Botón hamburguesa */}
      <Pressable
        style={[styles.hamburgerButton, { backgroundColor: cardBg, borderColor }]}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir menú de navegación"
        accessibilityHint="Pulsa para ver todas las secciones de la aplicación"
      >
        <IconSymbol name="line.3.horizontal" size={24} color={textColor} />
      </Pressable>

      {/* Modal del menú */}
      <Modal
        visible={isOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <Pressable 
            style={[styles.menuContainer, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header del menú */}
            <View style={[styles.menuHeader, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.menuTitle}>Menú</ThemedText>
              <Pressable 
                onPress={() => setIsOpen(false)} 
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú"
              >
                <IconSymbol name="xmark" size={24} color={textColor} />
              </Pressable>
            </View>

            {/* Items del menú */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => {
                // Ocultar sección de administración si no es admin
                if ((item.key === 'section_admin' || item.key === 'admin_alerts' || item.key === 'admin_alert_history' || item.key === 'admin_help' || item.key === 'divider4') && !isAdminUser) {
                  return null;
                }
                // Divisor
                if (item.key.startsWith('divider')) {
                  return <View key={item.key} style={[styles.divider, { backgroundColor: borderColor }]} />;
                }

                // Cabecera de sección
                if (item.section === 'header') {
                  return (
                    <ThemedText key={item.key} style={[styles.sectionHeader, { color: textSecondary }]}>
                      {item.label}
                    </ThemedText>
                  );
                }

                const isActive = isActiveRoute(item.route);

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.menuItem,
                      isActive && { backgroundColor: accent + '15' },
                    ]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.7}
                    accessibilityRole="menuitem"
                    accessibilityLabel={`${item.label}${item.premium ? ', función premium' : ''}${isActive ? ', sección actual' : ''}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: item.color + '20' }]}>
                      <IconSymbol name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <ThemedText 
                      style={[
                        styles.menuItemLabel,
                        isActive && { color: accent, fontWeight: '700' }
                      ]}
                    >
                      {item.label}
                    </ThemedText>
                    {item.premium && (
                      <View style={styles.premiumBadge}>
                        <IconSymbol name="star.fill" size={10} color="#F59E0B" />
                      </View>
                    )}
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: accent }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
              
              {/* Divisor antes de logout */}
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              
              {/* Botón de Cerrar Sesión - separado del map */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#EF444420' }]}>
                  <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#EF4444" />
                </View>
                <ThemedText style={[styles.menuItemLabel, { color: '#EF4444' }]}>
                  Cerrar Sesión
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    width: 300,
    maxWidth: '85%',
    height: '100%',
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    ...Platform.select({
      web: {
        boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  menuScroll: {
    flex: 1,
    padding: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  logoutItem: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
});
