/**
 * Drawer Layout - Piano Emotion Manager
 * Sistema de navegación con sidebar/drawer responsivo
 * 
 * - Móvil (< 768px): Drawer deslizable con botón hamburguesa
 * - Tablet/Desktop (≥ 768px): Sidebar fijo permanente
 */

import { Drawer } from 'expo-router/drawer';
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomSidebar from '@/components/layout/CustomSidebar';
import CustomHeader from '@/components/layout/CustomHeader';
import { HeaderProvider, useHeader } from '@/contexts/HeaderContext';

const SIDEBAR_WIDTH = 260;
const TABLET_BREAKPOINT = 768;

function DrawerContent() {
  const { width } = useWindowDimensions();
  const isTabletOrDesktop = width >= TABLET_BREAKPOINT;
  const { headerConfig } = useHeader();

  // Hacer screenOptions reactivo al headerConfig
  const screenOptions = useMemo(() => ({ navigation }: any) => ({
    drawerStyle: {
      width: SIDEBAR_WIDTH,
      backgroundColor: '#ffffff',
    },
    // Sidebar permanente en tablet/desktop, deslizable en móvil
    drawerType: isTabletOrDesktop ? 'permanent' : 'slide',
    header: () => (
      <CustomHeader
        title={headerConfig.title}
        subtitle={headerConfig.subtitle}
        icon={headerConfig.icon}
        iconColor={headerConfig.iconColor}
        showBackButton={headerConfig.showBackButton}
        rightAction={headerConfig.rightAction}
        onMenuPress={() => navigation.toggleDrawer()}
        showMenuButton={!isTabletOrDesktop}
      />
    ),
    headerShown: true,
    // Swipe solo habilitado en móvil
    swipeEnabled: !isTabletOrDesktop,
    swipeEdgeWidth: 50,
    // Overlay en móvil
    overlayColor: 'rgba(0, 0, 0, 0.5)',
  }), [headerConfig, isTabletOrDesktop]);

  return (
    <Drawer
      drawerContent={(props) => <CustomSidebar />}
      screenOptions={screenOptions as any}
    >
      {/* Pantalla principal - Dashboard */}
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Inicio',
          title: 'Inicio',
        }}
      />

      {/* Sección MAIN */}
      <Drawer.Screen
        name="agenda"
        options={{
          drawerLabel: 'Agenda',
          title: 'Agenda',
        }}
      />
      <Drawer.Screen
        name="clients"
        options={{
          drawerLabel: 'Clientes',
          title: 'Clientes',
        }}
      />
      <Drawer.Screen
        name="pianos"
        options={{
          drawerLabel: 'Pianos',
          title: 'Pianos',
        }}
      />
      <Drawer.Screen
        name="services"
        options={{
          drawerLabel: 'Servicios',
          title: 'Servicios',
        }}
      />
      <Drawer.Screen
        name="invoices"
        options={{
          drawerLabel: 'Facturacion',
          title: 'Facturacion',
        }}
      />
      <Drawer.Screen
        name="inventory"
        options={{
          drawerLabel: 'Inventario',
          title: 'Inventario',
        }}
      />

      {/* Sección COMERCIAL */}
      <Drawer.Screen
        name="store"
        options={{
          drawerLabel: 'Store',
          title: 'Store',
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: 'Reportes',
          title: 'Reportes',
        }}
      />

      {/* Sección HERRAMIENTAS */}
      <Drawer.Screen
        name="quick-access"
        options={{
          drawerLabel: 'Accesos Rapidos',
          title: 'Accesos Rapidos',
        }}
      />
      <Drawer.Screen
        name="advanced-tools"
        options={{
          drawerLabel: 'Herramientas Avanzadas',
          title: 'Herramientas Avanzadas',
        }}
      />
      <Drawer.Screen
        name="settings-unified"
        options={{
          drawerLabel: 'Configuración',
          title: 'Configuración',
        }}
      />
    </Drawer>
  );
}

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeaderProvider>
        <DrawerContent />
      </HeaderProvider>
    </GestureHandlerRootView>
  );
}
