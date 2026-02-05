import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface Recipient {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  whatsappMessage: string;
  smsMessage: string;
  emailSubject: string;
  emailMessage: string;
  status: 'pending' | 'sent' | 'skipped';
  pianoInfo?: string;
  lastService?: string;
}

// Datos de ejemplo - en producción vendrían de la API
const mockRecipients: Recipient[] = [
  {
    id: 1,
    clientId: 101,
    firstName: 'María',
    lastName: 'García López',
    phone: '+34612345678',
    email: 'maria.garcia@email.com',
    whatsappMessage: `Hola María,

Su piano *Yamaha U3* podría necesitar mantenimiento.

📅 *Último servicio:* Junio 2024
⏰ *Hace:* 7 meses

Para mantener su piano en óptimas condiciones, recomendamos una afinación cada 6-12 meses.

¿Le gustaría programar una cita?

Un saludo,
Piano Emotion`,
    emailSubject: 'Su piano podría necesitar mantenimiento - Piano Emotion',
    emailMessage: `Estimada María,

Le escribimos para recordarle que su piano Yamaha U3 podría necesitar mantenimiento.

INFORMACIÓN DEL ÚLTIMO SERVICIO
───────────────────────────────
Fecha: Junio 2024
Tiempo transcurrido: 7 meses

Para mantener su piano en óptimas condiciones, recomendamos realizar una afinación cada 6-12 meses.

¿Le gustaría programar una cita? Puede responder a este email o llamarnos.

Atentamente,

Piano Emotion
Tel: +34 612 345 678
Email: info@pianoemotion.com`,
    status: 'pending',
    pianoInfo: 'Yamaha U3',
    lastService: 'Junio 2024',
  },
  {
    id: 2,
    clientId: 102,
    firstName: 'Carlos',
    lastName: 'Martínez',
    phone: '+34623456789',
    email: 'carlos.martinez@email.com',
    whatsappMessage: `Hola Carlos,

Su piano *Steinway Model B* podría necesitar mantenimiento.

📅 *Último servicio:* Mayo 2024
⏰ *Hace:* 8 meses

¿Le gustaría programar una cita?

Un saludo,
Piano Emotion`,
    emailSubject: 'Su piano podría necesitar mantenimiento - Piano Emotion',
    emailMessage: `Estimado Carlos,

Le escribimos para recordarle que su piano Steinway Model B podría necesitar mantenimiento.

Último servicio: Mayo 2024
Tiempo transcurrido: 8 meses

¿Le gustaría programar una cita?

Atentamente,
Piano Emotion`,
    status: 'pending',
    pianoInfo: 'Steinway Model B',
    lastService: 'Mayo 2024',
  },
  {
    id: 3,
    clientId: 103,
    firstName: 'Ana',
    lastName: 'Rodríguez',
    phone: '+34634567890',
    email: 'ana.rodriguez@email.com',
    whatsappMessage: `Hola Ana,

Su piano *Kawai K-500* podría necesitar mantenimiento.

📅 *Último servicio:* Abril 2024
⏰ *Hace:* 9 meses

¿Le gustaría programar una cita?

Un saludo,
Piano Emotion`,
    emailSubject: 'Su piano podría necesitar mantenimiento - Piano Emotion',
    emailMessage: `Estimada Ana,

Le escribimos para recordarle que su piano Kawai K-500 podría necesitar mantenimiento.

Último servicio: Abril 2024
Tiempo transcurrido: 9 meses

¿Le gustaría programar una cita?

Atentamente,
Piano Emotion`,
    status: 'pending',
    pianoInfo: 'Kawai K-500',
    lastService: 'Abril 2024',
  },
  {
    id: 4,
    clientId: 104,
    firstName: 'Pedro',
    lastName: 'Sánchez Ruiz',
    phone: '+34645678901',
    email: 'pedro.sanchez@email.com',
    whatsappMessage: `Hola Pedro,

Su piano *Boston GP-178* podría necesitar mantenimiento.

📅 *Último servicio:* Marzo 2024
⏰ *Hace:* 10 meses

¿Le gustaría programar una cita?

Un saludo,
Piano Emotion`,
    emailSubject: 'Su piano podría necesitar mantenimiento - Piano Emotion',
    emailMessage: `Estimado Pedro,

Le escribimos para recordarle que su piano Boston GP-178 podría necesitar mantenimiento.

Último servicio: Marzo 2024
Tiempo transcurrido: 10 meses

¿Le gustaría programar una cita?

Atentamente,
Piano Emotion`,
    status: 'pending',
    pianoInfo: 'Boston GP-178',
    lastService: 'Marzo 2024',
  },
  {
    id: 5,
    clientId: 105,
    firstName: 'Laura',
    lastName: 'Fernández',
    phone: '+34656789012',
    email: 'laura.fernandez@email.com',
    whatsappMessage: `Hola Laura,

Su piano *Bechstein A-124* podría necesitar mantenimiento.

📅 *Último servicio:* Febrero 2024
⏰ *Hace:* 11 meses

¿Le gustaría programar una cita?

Un saludo,
Piano Emotion`,
    emailSubject: 'Su piano podría necesitar mantenimiento - Piano Emotion',
    emailMessage: `Estimada Laura,

Le escribimos para recordarle que su piano Bechstein A-124 podría necesitar mantenimiento.

Último servicio: Febrero 2024
Tiempo transcurrido: 11 meses

¿Le gustaría programar una cita?

Atentamente,
Piano Emotion`,
    status: 'pending',
    pianoInfo: 'Bechstein A-124',
    lastService: 'Febrero 2024',
  },
];

export default function BatchSendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  
  // Animation
  const slideAnim = useState(new Animated.Value(0))[0];
  
  useEffect(() => {
    loadRecipients();
  }, []);
  
  const loadRecipients = async () => {
    setIsLoading(true);
    try {
      // TODO: Cargar desde la API según el tipo o campaignId
      setRecipients(mockRecipients);
      
      // Encontrar el primer pendiente
      const firstPending = mockRecipients.findIndex(r => r.status === 'pending');
      if (firstPending >= 0) {
        setCurrentIndex(firstPending);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
      Alert.alert('Error', 'No se pudieron cargar los destinatarios');
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentRecipient = recipients[currentIndex];
  
  const pendingCount = recipients.filter(r => r.status === 'pending').length;
  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const skippedCount = recipients.filter(r => r.status === 'skipped').length;
  
  const openWhatsApp = useCallback(async () => {
    if (!currentRecipient) return;
    
    const phone = currentRecipient.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(currentRecipient.whatsappMessage);
    
    let url: string;
    if (Platform.OS === 'web') {
      url = `https://wa.me/${phone}?text=${message}`;
      window.open(url, '_blank');
    } else {
      url = `whatsapp://send?phone=${phone}&text=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir WhatsApp');
        return;
      }
    }
  }, [currentRecipient]);
  
  const openEmail = useCallback(async () => {
    if (!currentRecipient) return;
    
    const email = currentRecipient.email;
    const subject = encodeURIComponent(currentRecipient.emailSubject);
    const body = encodeURIComponent(currentRecipient.emailMessage);
    
    let url: string;
    if (Platform.OS === 'web') {
      url = `mailto:${email}?subject=${subject}&body=${body}`;
      window.open(url, '_blank');
    } else {
      url = `mailto:${email}?subject=${subject}&body=${body}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir la aplicación de correo');
        return;
      }
    }
  }, [currentRecipient]);
  
  const openSMS = useCallback(async () => {
    if (!currentRecipient) return;
    
    const phone = currentRecipient.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(currentRecipient.smsMessage || currentRecipient.whatsappMessage.substring(0, 160));
    
    let url: string;
    if (Platform.OS === 'web') {
      // En web, intentamos abrir con el protocolo sms:
      url = `sms:${phone}?body=${message}`;
      window.open(url, '_blank');
    } else if (Platform.OS === 'ios') {
      // iOS usa & en lugar de ?
      url = `sms:${phone}&body=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir la aplicación de mensajes');
        return;
      }
    } else {
      // Android
      url = `sms:${phone}?body=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir la aplicación de mensajes');
        return;
      }
    }
  }, [currentRecipient]);
  
  const markAsSent = useCallback(() => {
    if (!currentRecipient) return;
    
    // Actualizar estado local
    setRecipients(prev => prev.map(r => 
      r.id === currentRecipient.id ? { ...r, status: 'sent' as const } : r
    ));
    
    // TODO: Llamar a la API para registrar el envío
    
    // Avanzar al siguiente
    moveToNext();
  }, [currentRecipient]);
  
  const markAsSkipped = useCallback((reason?: string) => {
    if (!currentRecipient) return;
    
    // Actualizar estado local
    setRecipients(prev => prev.map(r => 
      r.id === currentRecipient.id ? { ...r, status: 'skipped' as const } : r
    ));
    
    // TODO: Llamar a la API para registrar el salto
    
    // Avanzar al siguiente
    moveToNext();
  }, [currentRecipient]);
  
  const moveToNext = useCallback(() => {
    // Animar salida
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Encontrar siguiente pendiente
      const nextPending = recipients.findIndex((r, i) => i > currentIndex && r.status === 'pending');
      
      if (nextPending >= 0) {
        setCurrentIndex(nextPending);
      } else {
        // Buscar desde el principio
        const firstPending = recipients.findIndex(r => r.status === 'pending');
        if (firstPending >= 0 && firstPending !== currentIndex) {
          setCurrentIndex(firstPending);
        } else {
          // No hay más pendientes
          Alert.alert(
            '¡Campaña Completada!',
            `Has enviado ${sentCount + 1} mensajes.\n${skippedCount} saltados.`,
            [{ text: 'Volver', onPress: () => router.back() }]
          );
          return;
        }
      }
      
      // Animar entrada
      slideAnim.setValue(100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [currentIndex, recipients, sentCount, skippedCount]);
  
  const sendAndNext = useCallback(async () => {
    if (selectedChannel === 'whatsapp') {
      await openWhatsApp();
    } else if (selectedChannel === 'sms') {
      await openSMS();
    } else {
      await openEmail();
    }
    
    // Mostrar confirmación
    const channelName = selectedChannel === 'whatsapp' ? 'mensaje de WhatsApp' : selectedChannel === 'sms' ? 'SMS' : 'email';
    Alert.alert(
      '¿Mensaje enviado?',
      `Confirma que has enviado el ${channelName}`,
      [
        { text: 'Sí, enviado', onPress: markAsSent },
        { text: 'No lo envié', style: 'cancel' },
      ]
    );
  }, [selectedChannel, openWhatsApp, openEmail, openSMS, markAsSent]);
  
  const skipRecipient = useCallback(() => {
    Alert.alert(
      'Saltar destinatario',
      '¿Por qué quieres saltar este contacto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: selectedChannel === 'email' ? 'Email incorrecto' : 'Número incorrecto', onPress: () => markAsSkipped(selectedChannel === 'email' ? 'Email incorrecto' : 'Número incorrecto') },
        { text: 'Ya contactado', onPress: () => markAsSkipped('Ya contactado') },
        { text: 'Otro motivo', onPress: () => markAsSkipped('Otro') },
      ]
    );
  }, [markAsSkipped, selectedChannel]);
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    pauseButton: {
      padding: 8,
    },
    // Channel selector
    channelSelector: {
      flexDirection: 'row',
      padding: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    channelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 4,
      marginHorizontal: 4,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
    },
    channelButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    channelButtonWhatsApp: {
      borderColor: '#25D366',
      backgroundColor: '#25D36610',
    },
    channelButtonEmail: {
      borderColor: '#EA4335',
      backgroundColor: '#EA433510',
    },
    channelButtonSMS: {
      borderColor: '#3B82F6',
      backgroundColor: '#3B82F610',
    },
    channelIcon: {
      marginRight: 8,
    },
    channelText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    channelTextActive: {
      color: colors.primary,
    },
    // Progress section
    progressSection: {
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    progressStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    statBox: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    progressSent: {
      backgroundColor: '#4CAF50',
    },
    progressSkipped: {
      backgroundColor: '#FF9800',
    },
    // Current recipient card
    recipientSection: {
      flex: 1,
      padding: 16,
    },
    recipientCard: {
      backgroundColor: colors.card,
      borderRadius: 4,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    recipientHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 4,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    avatarText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#fff',
    },
    recipientInfo: {
      flex: 1,
    },
    recipientName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    recipientContact: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    recipientMeta: {
      flexDirection: 'row',
      marginTop: 4,
      flexWrap: 'wrap',
    },
    metaTag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 8,
      marginTop: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.primary,
    },
    messagePreview: {
      backgroundColor: colors.background,
      borderRadius: 4,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messagePreviewTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    messageSubject: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    messageText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    // Action buttons
    actionSection: {
      padding: 16,
      paddingBottom: 32,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 4,
      marginBottom: 12,
    },
    mainButtonWhatsApp: {
      backgroundColor: '#25D366',
    },
    mainButtonEmail: {
      backgroundColor: '#EA4335',
    },
    mainButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    secondaryButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    skipButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 4,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    skipButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    sentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 4,
      backgroundColor: '#4CAF50',
      marginLeft: 8,
    },
    sentButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    // Empty state
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    completedButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 4,
      marginTop: 24,
    },
    completedButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    // Queue list
    queueSection: {
      marginTop: 16,
    },
    queueTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    queueAvatar: {
      width: 32,
      height: 32,
      borderRadius: 4,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    queueAvatarText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    queueName: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
  });
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cargando...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  if (pendingCount === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Envío Completado</Text>
          </View>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>¡Campaña Completada!</Text>
          <Text style={styles.emptyText}>
            Has enviado {sentCount} mensajes.{'\n'}
            {skippedCount > 0 && `${skippedCount} contactos saltados.`}
          </Text>
          <TouchableOpacity style={styles.completedButton} onPress={() => router.back()}>
            <Text style={styles.completedButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Envío por Lotes</Text>
        </View>
        <TouchableOpacity style={styles.pauseButton} onPress={() => setIsPaused(!isPaused)}>
          <Ionicons name={isPaused ? "play" : "pause"} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Channel Selector */}
      <View style={styles.channelSelector}>
        <TouchableOpacity 
          style={[
            styles.channelButton, 
            selectedChannel === 'whatsapp' && styles.channelButtonWhatsApp
          ]}
          onPress={() => setSelectedChannel('whatsapp')}
        >
          <Ionicons 
            name="logo-whatsapp" 
            size={20} 
            color={selectedChannel === 'whatsapp' ? '#25D366' : colors.textSecondary} 
            style={styles.channelIcon}
          />
          <Text style={[
            styles.channelText, 
            selectedChannel === 'whatsapp' && { color: '#25D366' }
          ]}>
            WhatsApp
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.channelButton, 
            selectedChannel === 'email' && styles.channelButtonEmail
          ]}
          onPress={() => setSelectedChannel('email')}
        >
          <Ionicons 
            name="mail" 
            size={20} 
            color={selectedChannel === 'email' ? '#EA4335' : colors.textSecondary} 
            style={styles.channelIcon}
          />
          <Text style={[
            styles.channelText, 
            selectedChannel === 'email' && { color: '#EA4335' }
          ]}>
            Email
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.channelButton, 
            selectedChannel === 'sms' && styles.channelButtonSMS
          ]}
          onPress={() => setSelectedChannel('sms')}
        >
          <Ionicons 
            name="chatbubble" 
            size={20} 
            color={selectedChannel === 'sms' ? '#3B82F6' : colors.textSecondary} 
            style={styles.channelIcon}
          />
          <Text style={[
            styles.channelText, 
            selectedChannel === 'sms' && { color: '#3B82F6' }
          ]}>
            SMS
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressStats}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{sentCount}</Text>
            <Text style={styles.statLabel}>Enviados</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{skippedCount}</Text>
            <Text style={styles.statLabel}>Saltados</Text>
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressSent, 
              { width: `${(sentCount / recipients.length) * 100}%` }
            ]} 
          />
          <View 
            style={[
              styles.progressSkipped, 
              { width: `${(skippedCount / recipients.length) * 100}%` }
            ]} 
          />
        </View>
      </View>
      
      {/* Current Recipient */}
      {currentRecipient && (
        <ScrollView style={styles.recipientSection}>
          <Animated.View 
            style={[
              styles.recipientCard,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <View style={styles.recipientHeader}>
              <View style={[
                styles.avatar, 
                { backgroundColor: selectedChannel === 'whatsapp' ? '#25D366' : '#EA4335' }
              ]}>
                <Text style={styles.avatarText}>
                  {currentRecipient.firstName.charAt(0)}
                </Text>
              </View>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>
                  {currentRecipient.firstName} {currentRecipient.lastName}
                </Text>
                <Text style={styles.recipientContact}>
                  {selectedChannel === 'whatsapp' 
                    ? currentRecipient.phone 
                    : currentRecipient.email
                  }
                </Text>
                <View style={styles.recipientMeta}>
                  {currentRecipient.pianoInfo && (
                    <View style={styles.metaTag}>
                      <Text style={styles.metaText}>{currentRecipient.pianoInfo}</Text>
                    </View>
                  )}
                  {currentRecipient.lastService && (
                    <View style={styles.metaTag}>
                      <Text style={styles.metaText}>Último: {currentRecipient.lastService}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.messagePreview}>
              <Text style={styles.messagePreviewTitle}>
                {selectedChannel === 'whatsapp' ? 'MENSAJE WHATSAPP' : 'EMAIL'}
              </Text>
              {selectedChannel === 'email' && (
                <Text style={styles.messageSubject}>
                  Asunto: {currentRecipient.emailSubject}
                </Text>
              )}
              <Text style={styles.messageText}>
                {selectedChannel === 'whatsapp' 
                  ? currentRecipient.whatsappMessage 
                  : currentRecipient.emailMessage
                }
              </Text>
            </View>
          </Animated.View>
          
          {/* Queue preview */}
          <View style={styles.queueSection}>
            <Text style={styles.queueTitle}>PRÓXIMOS EN LA COLA</Text>
            {recipients
              .filter(r => r.status === 'pending' && r.id !== currentRecipient.id)
              .slice(0, 3)
              .map((r) => (
                <View key={r.id} style={styles.queueItem}>
                  <View style={styles.queueAvatar}>
                    <Text style={styles.queueAvatarText}>{r.firstName.charAt(0)}</Text>
                  </View>
                  <Text style={styles.queueName}>{r.firstName} {r.lastName}</Text>
                </View>
              ))
            }
          </View>
        </ScrollView>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[
            styles.mainButton, 
            selectedChannel === 'whatsapp' ? styles.mainButtonWhatsApp : styles.mainButtonEmail
          ]} 
          onPress={sendAndNext}
        >
          <Ionicons 
            name={selectedChannel === 'whatsapp' ? 'logo-whatsapp' : 'mail'} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.mainButtonText}>
            {selectedChannel === 'whatsapp' ? 'Enviar por WhatsApp' : 'Enviar Email'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={skipRecipient}>
            <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
            <Text style={styles.skipButtonText}>Saltar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sentButton} onPress={markAsSent}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.sentButtonText}>Ya enviado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
