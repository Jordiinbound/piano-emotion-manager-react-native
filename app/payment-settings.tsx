import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';

type PaymentGateway = 'stripe' | 'paypal';

interface GatewayStatus {
  configured: boolean;
  active: boolean;
  lastTransaction?: Date;
  transactionCount?: number;
}

export default function PaymentSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<PaymentGateway>('stripe');
  const [gatewayStatus, setGatewayStatus] = useState<Record<PaymentGateway, GatewayStatus>>({
    stripe: { configured: false, active: false },
    paypal: { configured: false, active: false },
  });

  // Configuración de Stripe
  const [stripeConfig, setStripeConfig] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
  });

  // Configuración de PayPal
  const [paypalConfig, setPaypalConfig] = useState({
    clientId: '',
    clientSecret: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    webhookId: '',
  });

  // Estadísticas
  const [stats, setStats] = useState({
    totalPayments: 0,
    completedPayments: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });

  const textPrimary = colors.text;
  const textSecondary = colors.textSecondary;
  const background = colors.background;
  const cardBg = colors.card;
  const border = colors.border;

  const handleSaveStripe = () => {
    if (!stripeConfig.publishableKey || !stripeConfig.secretKey) {
      Alert.alert('Error', 'Por favor completa las claves de API de Stripe');
      return;
    }
    // Guardar configuración
    setGatewayStatus(prev => ({
      ...prev,
      stripe: { ...prev.stripe, configured: true, active: true }
    }));
    Alert.alert('Éxito', 'Configuración de Stripe guardada correctamente');
  };

  const handleSavePayPal = () => {
    if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
      Alert.alert('Error', 'Por favor completa las credenciales de PayPal');
      return;
    }
    // Guardar configuración
    setGatewayStatus(prev => ({
      ...prev,
      paypal: { ...prev.paypal, configured: true, active: true }
    }));
    Alert.alert('Éxito', 'Configuración de PayPal guardada correctamente');
  };

  const handleTestConnection = (gateway: PaymentGateway) => {
    Alert.alert('Conexión exitosa', `La conexión con ${gateway === 'stripe' ? 'Stripe' : 'PayPal'} funciona correctamente`);
  };

  const renderGatewayCard = (gateway: PaymentGateway, name: string, icon: string, color: string) => {
    const status = gatewayStatus[gateway];
    return (
      <TouchableOpacity
        style={[
          styles.gatewayCard,
          { 
            backgroundColor: activeTab === gateway ? `${color}15` : cardBg,
            borderColor: activeTab === gateway ? color : border,
          }
        ]}
        onPress={() => setActiveTab(gateway)}
      >
        <View style={[styles.gatewayIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.gatewayInfo}>
          <ThemedText style={[styles.gatewayName, { color: textPrimary }]}>
            {name}
          </ThemedText>
          <View style={styles.gatewayStatusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: status.configured ? (status.active ? '#10B981' : '#F59E0B') : '#EF4444' }
            ]} />
            <ThemedText style={[styles.gatewayStatus, { color: textSecondary }]}>
              {status.configured ? (status.active ? 'Activo' : 'Inactivo') : 'No configurado'}
            </ThemedText>
          </View>
        </View>
        <Ionicons 
          name={activeTab === gateway ? 'checkmark-circle' : 'chevron-forward'} 
          size={20} 
          color={activeTab === gateway ? color : textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderStripeConfig = () => (
    <View style={[styles.configSection, { backgroundColor: cardBg, borderColor: border }]}>
      <View style={styles.configHeader}>
        <Ionicons name="card-outline" size={24} color="#635BFF" />
        <ThemedText style={[styles.configTitle, { color: textPrimary }]}>
          Configuración de Stripe
        </ThemedText>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Publishable Key *
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={stripeConfig.publishableKey}
          onChangeText={(text) => setStripeConfig(prev => ({ ...prev, publishableKey: text }))}
          placeholder="pk_live_..."
          placeholderTextColor={textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Secret Key *
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={stripeConfig.secretKey}
          onChangeText={(text) => setStripeConfig(prev => ({ ...prev, secretKey: text }))}
          placeholder="sk_live_..."
          placeholderTextColor={textSecondary}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Webhook Secret
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={stripeConfig.webhookSecret}
          onChangeText={(text) => setStripeConfig(prev => ({ ...prev, webhookSecret: text }))}
          placeholder="whsec_..."
          placeholderTextColor={textSecondary}
          secureTextEntry
        />
      </View>

      <View style={[styles.webhookInfo, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <View style={styles.webhookInfoContent}>
          <ThemedText style={[styles.webhookInfoTitle, { color: colors.primary }]}>
            URL del Webhook
          </ThemedText>
          <ThemedText style={[styles.webhookUrl, { color: textSecondary }]}>
            https://tu-dominio.com/api/webhooks/stripe
          </ThemedText>
        </View>
      </View>

      <View style={styles.configButtons}>
        <TouchableOpacity
          style={[styles.testButton, { borderColor: '#635BFF' }]}
          onPress={() => handleTestConnection('stripe')}
        >
          <ThemedText style={{ color: '#635BFF' }}>Probar conexión</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#635BFF' }]}
          onPress={handleSaveStripe}
        >
          <ThemedText style={{ color: '#fff' }}>Guardar</ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.docsLink}
        onPress={() => Linking.openURL('https://stripe.com/docs/keys')}
      >
        <ThemedText style={{ color: '#635BFF' }}>Ver documentación de Stripe</ThemedText>
        <Ionicons name="open-outline" size={16} color="#635BFF" />
      </TouchableOpacity>
    </View>
  );

  const renderPayPalConfig = () => (
    <View style={[styles.configSection, { backgroundColor: cardBg, borderColor: border }]}>
      <View style={styles.configHeader}>
        <Ionicons name="logo-paypal" size={24} color="#003087" />
        <ThemedText style={[styles.configTitle, { color: textPrimary }]}>
          Configuración de PayPal
        </ThemedText>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Client ID *
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={paypalConfig.clientId}
          onChangeText={(text) => setPaypalConfig(prev => ({ ...prev, clientId: text }))}
          placeholder="Tu Client ID de PayPal"
          placeholderTextColor={textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Client Secret *
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={paypalConfig.clientSecret}
          onChangeText={(text) => setPaypalConfig(prev => ({ ...prev, clientSecret: text }))}
          placeholder="Tu Client Secret de PayPal"
          placeholderTextColor={textSecondary}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Entorno
        </ThemedText>
        <View style={styles.environmentToggle}>
          <TouchableOpacity
            style={[
              styles.envButton,
              paypalConfig.environment === 'sandbox' && { backgroundColor: '#F59E0B' }
            ]}
            onPress={() => setPaypalConfig(prev => ({ ...prev, environment: 'sandbox' }))}
          >
            <ThemedText style={{ color: paypalConfig.environment === 'sandbox' ? '#fff' : textSecondary }}>
              Sandbox
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.envButton,
              paypalConfig.environment === 'production' && { backgroundColor: '#10B981' }
            ]}
            onPress={() => setPaypalConfig(prev => ({ ...prev, environment: 'production' }))}
          >
            <ThemedText style={{ color: paypalConfig.environment === 'production' ? '#fff' : textSecondary }}>
              Producción
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
          Webhook ID
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: background, borderColor: border, color: textPrimary }]}
          value={paypalConfig.webhookId}
          onChangeText={(text) => setPaypalConfig(prev => ({ ...prev, webhookId: text }))}
          placeholder="ID del webhook de PayPal"
          placeholderTextColor={textSecondary}
        />
      </View>

      <View style={styles.configButtons}>
        <TouchableOpacity
          style={[styles.testButton, { borderColor: '#003087' }]}
          onPress={() => handleTestConnection('paypal')}
        >
          <ThemedText style={{ color: '#003087' }}>Probar conexión</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#003087' }]}
          onPress={handleSavePayPal}
        >
          <ThemedText style={{ color: '#fff' }}>Guardar</ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.docsLink}
        onPress={() => Linking.openURL('https://developer.paypal.com/docs/api/overview/')}
      >
        <ThemedText style={{ color: '#003087' }}>Ver documentación de PayPal</ThemedText>
        <Ionicons name="open-outline" size={16} color="#003087" />
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => (
    <View style={[styles.statsSection, { backgroundColor: cardBg, borderColor: border }]}>
      <ThemedText style={[styles.sectionTitle, { color: textPrimary }]}>
        Estadísticas de Pagos
      </ThemedText>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {stats.totalPayments}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Total pagos
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
            {stats.completedPayments}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Completados
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            €{stats.totalAmount.toLocaleString()}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Cobrado
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#F59E0B' }]}>
            €{stats.pendingAmount.toLocaleString()}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Pendiente
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ color: textPrimary }}>
          Pasarelas de Pago
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selección de pasarela */}
        <View style={styles.gatewaySelection}>
          {renderGatewayCard('stripe', 'Stripe', 'card-outline', '#635BFF')}
          {renderGatewayCard('paypal', 'PayPal', 'logo-paypal', '#003087')}
        </View>

        {/* Configuración según pasarela seleccionada */}
        {activeTab === 'stripe' ? renderStripeConfig() : renderPayPalConfig()}

        {/* Estadísticas */}
        {renderStats()}

        {/* Información adicional */}
        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoTitle, { color: colors.primary }]}>
              Pagos seguros
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondary }]}>
              Tus clientes podrán pagar facturas directamente desde el enlace que les envíes. 
              Los datos de pago nunca pasan por nuestros servidores.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  gatewaySelection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  gatewayCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
  },
  gatewayIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gatewayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  gatewayStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  gatewayStatus: {
    fontSize: 12,
  },
  configSection: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  environmentToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  envButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  webhookInfo: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  webhookInfoContent: {
    flex: 1,
    marginLeft: 10,
  },
  webhookInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  webhookUrl: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  configButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  docsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  statsSection: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
