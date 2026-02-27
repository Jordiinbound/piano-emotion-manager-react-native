import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#003a8c',
  accent: '#e07a5f',
  white: '#ffffff',
  gray: '#f5f5f5',
  textGray: '#666666',
};

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  useArkhip?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'inicio', label: 'Inicio', icon: 'home-outline', route: '/(drawer)' },
      { id: 'agenda', label: 'Agenda', icon: 'calendar-outline', route: '/(drawer)/agenda' },
      { id: 'clientes', label: 'Clientes', icon: 'people-outline', route: '/(drawer)/clients' },
      { id: 'pianos', label: 'Pianos', icon: 'musical-notes-outline', route: '/(drawer)/pianos' },
      { id: 'servicios', label: 'Servicios', icon: 'construct-outline', route: '/(drawer)/services' },
      { id: 'facturacion', label: 'Facturación', icon: 'receipt-outline', route: '/(drawer)/invoices' },
      { id: 'inventario', label: 'Inventario', icon: 'cube-outline', route: '/(drawer)/inventory' },
    ],
  },
  {
    title: 'COMERCIAL',
    items: [
      { id: 'store', label: 'Store', icon: 'storefront-outline', route: '/(drawer)/store' },
      { id: 'reportes', label: 'Reportes', icon: 'stats-chart-outline', route: '/(drawer)/reports' },
    ],
  },
  {
    title: 'HERRAMIENTAS',
    items: [
      { id: 'afinador', label: 'Afinador', icon: 'ear-outline', route: '/tuner' },
      { id: 'accesos', label: 'Accesos Rápidos', icon: 'flash-outline', route: '/(drawer)/quick-access' },
      { id: 'herramientas', label: 'Herramientas Avanzadas', icon: 'build-outline', route: '/(drawer)/advanced-tools' },
      { id: 'configuracion', label: 'Configuración', icon: 'cog-outline', route: '/(drawer)/settings' },
    ],
  },
];

export default function CustomSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  const isActive = (route: string) => {
    console.log('🔍 isActive check:', { pathname, route });
    
    // Para la ruta principal del drawer, considerar tanto '/(drawer)' como '/'
    if (route === '/(drawer)') {
      const result = pathname === '/(drawer)' || pathname === '/' || pathname === '';
      console.log('  → Home check:', result);
      return result;
    }
    
    // Comparación directa
    if (pathname === route || pathname.startsWith(route + '/')) {
      console.log('  → Direct match: true');
      return true;
    }
    
    // Comparar pathname con route sin el prefijo /(drawer)/ o /(tabs)/
    // Por ejemplo: pathname='/agenda' y route='/(drawer)/agenda'
    const routeWithoutPrefix = route.replace(/^\/\((drawer|tabs)\)/, '');
    const result = pathname === routeWithoutPrefix || pathname.startsWith(routeWithoutPrefix + '/');
    console.log('  → Prefix removed:', { routeWithoutPrefix, result });
    return result;
  };

  return (
    <View style={styles.container}>
      {/* Logo/Brand */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/favicon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.brandText}>Piano Emotion</Text>
          <Text style={styles.brandText}>Manager</Text>
        </View>
      </View>

      {/* Menu Sections */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => {
              const active = isActive(item.route);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => handleNavigation(item.route)}
                >
                  {active && <View style={styles.activeIndicator} />}
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? COLORS.primary : COLORS.textGray}
                    style={styles.menuIcon}
                  />
                  <Text style={[
                    styles.menuLabel, 
                    active && styles.menuLabelActive,
                    item.useArkhip && { fontFamily: 'Arkhip' }
                  ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    tintColor: COLORS.primary, // Azul cobalto
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 22,
    fontFamily: 'Arkhip',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textGray,
    paddingHorizontal: 20,
    paddingBottom: 8,
    letterSpacing: 0.5,
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 20,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...Platform.select({
      web: {
        zIndex: 10,
      },
    }),
  },
  menuItemPressed: {
    backgroundColor: '#f0f0f0',
  },

  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: COLORS.textGray,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    fontWeight: '400',
  },
  menuLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    fontWeight: '700',
  },
});
