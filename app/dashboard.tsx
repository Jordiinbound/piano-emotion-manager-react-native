import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY_COLOR = '#003a8c'; // Azul cobalto oscuro
const ACCENT_COLOR = '#e07a5f'; // Rojo terracota
const BACKGROUND_COLOR = '#f8f9fa';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSidebar, setShowSidebar] = useState(true);

  const navigationItems = [
    { label: 'Inicio', icon: '🏠', route: '/' },
    { label: 'Clientes', icon: '👥', route: '/clients' },
    { label: 'Pianos', icon: '🎹', route: '/pianos' },
    { label: 'Servicios', icon: '🔧', route: '/services' },
    { label: 'Agenda', icon: '📅', route: '/calendar' },
  ];

  const quickActions = [
    { label: 'Nuevo Cliente', icon: '➕', color: PRIMARY_COLOR },
    { label: 'Nuevo Piano', icon: '🎹', color: ACCENT_COLOR },
    { label: 'Nuevo Servicio', icon: '🔧', color: PRIMARY_COLOR },
    { label: 'Nueva Cita', icon: '📅', color: ACCENT_COLOR },
  ];

  const sections = [
    { title: 'Alertas y Avisos', icon: '⚠️', content: 'Mostrando 15 de 816 alertas' },
    { title: 'Acciones Rápidas', icon: '⚡', content: 'Acciones disponibles' },
    { title: 'Predicciones IA', icon: '🤖', content: 'Análisis de datos' },
    { title: 'Este Mes', icon: '📊', content: 'Resumen mensual' },
    { title: 'Servicios Recientes', icon: '📋', content: 'Últimos servicios' },
    { title: 'Accesos Rapidos', icon: '⭐', content: 'Accesos favoritos' },
    { title: 'Herramientas Avanzadas', icon: '🛠️', content: 'Herramientas' },
    { title: 'Ayuda', icon: '❓', content: 'Centro de ayuda' },
    { title: 'Piano Emotion Store', icon: '🎹', content: 'Tienda' },
  ];

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Panel de Control',
          headerBackTitle: 'Inicio',
        }} 
      />
      
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => setShowSidebar(!showSidebar)}>
              <ThemedText style={styles.menuIcon}>☰</ThemedText>
            </Pressable>
            <View style={styles.headerTitle}>
              <ThemedText style={styles.headerTitleText}>Piano Emotion Manager</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Lunes, 19 De Enero</ThemedText>
            </View>
            <View style={styles.headerIcons}>
              <Pressable><ThemedText style={styles.iconButton}>🔔</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.iconButton}>⚙️</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.iconButton}>👤</ThemedText></Pressable>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 }
          ]}
        >
          {/* Quick Actions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <Pressable 
                  key={index}
                  style={[styles.quickActionButton, { borderLeftColor: action.color }]}
                >
                  <ThemedText style={styles.quickActionIcon}>{action.icon}</ThemedText>
                  <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Main Sections */}
          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionIcon}>{section.icon}</ThemedText>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              </View>
              <View style={styles.sectionContent}>
                <ThemedText style={styles.sectionText}>{section.content}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
          {navigationItems.map((item, index) => (
            <Pressable 
              key={index}
              style={styles.navItem}
              onPress={() => router.push(item.route)}
            >
              <ThemedText style={styles.navIcon}>{item.icon}</ThemedText>
              <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Floating AI Button */}
        <Pressable style={styles.floatingButton}>
          <ThemedText style={styles.floatingButtonText}>🤖</ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 28,
  },
});
