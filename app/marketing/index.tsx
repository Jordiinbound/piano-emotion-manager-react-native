import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

export default function MarketingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    heroSection: {
      backgroundColor: colors.primary,
      borderRadius: 4,
      padding: 24,
      marginBottom: 24,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    menuCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuIcon: {
      width: 48,
      height: 48,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    menuInfo: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    menuDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    quickStatsSection: {
      marginTop: 24,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 16,
      marginHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    tipCard: {
      backgroundColor: colors.primary + '10',
      borderRadius: 4,
      padding: 16,
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tipIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    tipText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketing</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Centro de Marketing</Text>
          <Text style={styles.heroSubtitle}>
            Gestiona tus campañas de WhatsApp, configura plantillas de mensajes y mantén el contacto con tus clientes de forma eficiente.
          </Text>
        </View>
        
        {/* Menu Options */}
        <Text style={styles.sectionTitle}>Herramientas</Text>
        
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/marketing/send?type=maintenance')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="paper-plane" size={24} color="#fff" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Envío Rápido</Text>
            <Text style={styles.menuDescription}>
              Enviar recordatorios de mantenimiento a clientes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/marketing/campaigns')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="megaphone" size={24} color="#fff" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Campañas</Text>
            <Text style={styles.menuDescription}>
              Crear y gestionar campañas de marketing
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/marketing/templates')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#9C27B0' }]}>
            <Ionicons name="document-text" size={24} color="#fff" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Plantillas de Mensajes</Text>
            <Text style={styles.menuDescription}>
              Configurar mensajes predefinidos para cada acción
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        {/* Quick Stats */}
        <View style={styles.quickStatsSection}>
          <Text style={styles.sectionTitle}>Este Mes</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Mensajes{'\n'}Enviados</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Campañas{'\n'}Activas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Clientes{'\n'}Contactados</Text>
            </View>
          </View>
        </View>
        
        {/* Tip Card */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color={colors.primary} style={styles.tipIcon} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Consejo</Text>
            <Text style={styles.tipText}>
              Los recordatorios de mantenimiento enviados entre 6-12 meses después del último servicio tienen la mayor tasa de respuesta. Usa el filtro "Necesitan mantenimiento" para encontrar estos clientes.
            </Text>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
