/**
 * ShareReport — Compartir informe per email/WhatsApp
 * 
 * Genera un resum de l'afinació i permet compartir-lo
 * via Web Share API, email o WhatsApp.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import {
  TOTAL_KEYS,
  getFullNoteName,
} from '@/constants/piano-tuning';
import type { KeyMeasurement } from '@/contexts/TunerContext';

interface ShareReportProps {
  /** Mesures per tecla */
  measurements: (KeyMeasurement | null)[];
  /** Nom del piano (si hi ha perfil) */
  pianoName?: string;
  /** Mode fosc */
  darkTuningMode?: boolean;
}

function generateTextReport(
  measurements: (KeyMeasurement | null)[],
  pianoName?: string,
): string {
  const measured = measurements.filter(m => m !== null) as KeyMeasurement[];
  if (measured.length === 0) return 'No hi ha mesures disponibles.';

  const avgDev = measured.reduce((s, m) => s + Math.abs(m.centsDeviation), 0) / measured.length;
  const maxDev = measured.reduce((max, m) => Math.abs(m.centsDeviation) > Math.abs(max.centsDeviation) ? m : max, measured[0]);
  const inTune = measured.filter(m => Math.abs(m.centsDeviation) <= 5).length;
  const score = Math.round(measured.reduce((s, m) => {
    const a = Math.abs(m.centsDeviation);
    return s + (a <= 1 ? 100 : a <= 2 ? 95 : a <= 5 ? 85 : a <= 8 ? 70 : a <= 12 ? 55 : a <= 20 ? 35 : 15);
  }, 0) / measured.length);

  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let report = `🎹 INFORME D'AFINACIÓ\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (pianoName) report += `Piano: ${pianoName}\n`;
  report += `Data: ${date}\n`;
  report += `\n`;
  report += `📊 RESUM\n`;
  report += `• Puntuació global: ${score}/100\n`;
  report += `• Tecles mesurades: ${measured.length}/${TOTAL_KEYS}\n`;
  report += `• Tecles afinades (±5¢): ${inTune}/${measured.length}\n`;
  report += `• Desviació mitjana: ±${avgDev.toFixed(1)}¢\n`;
  report += `• Pitjor nota: ${getFullNoteName(maxDev.keyIndex)} (${maxDev.centsDeviation > 0 ? '+' : ''}${maxDev.centsDeviation.toFixed(1)}¢)\n`;
  report += `\n`;

  // Tecles problemàtiques
  const problematic = measured
    .filter(m => Math.abs(m.centsDeviation) > 10)
    .sort((a, b) => Math.abs(b.centsDeviation) - Math.abs(a.centsDeviation));

  if (problematic.length > 0) {
    report += `⚠️ TECLES QUE NECESSITEN ATENCIÓ\n`;
    problematic.forEach(m => {
      report += `  ${getFullNoteName(m.keyIndex)}: ${m.centsDeviation > 0 ? '+' : ''}${m.centsDeviation.toFixed(1)}¢\n`;
    });
    report += `\n`;
  }

  // Recomanació
  if (score >= 90) {
    report += `✅ El piano està en excel·lent estat d'afinació.\n`;
  } else if (score >= 75) {
    report += `👍 El piano està en bon estat. Es recomana una revisió en 6-12 mesos.\n`;
  } else if (score >= 60) {
    report += `⚠️ El piano necessita una afinació professional.\n`;
  } else {
    report += `🔴 El piano necessita una afinació urgent.\n`;
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `Generat amb Piano Emotion Tuner\n`;
  report += `www.pianoemotion.com`;

  return report;
}

export function ShareReport({ measurements, pianoName, darkTuningMode }: ShareReportProps) {
  const [sharing, setSharing] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const fgText = darkTuningMode ? '#ffffff' : textColor;
  const fgMuted = darkTuningMode ? '#888888' : textSecondary;
  const bgSurface = darkTuningMode ? '#1a1a1a' : surface;
  const bgBorder = darkTuningMode ? '#333333' : border;

  const measured = measurements.filter(m => m !== null).length;

  const handleShare = useCallback(async (method: 'native' | 'email' | 'whatsapp' | 'copy') => {
    if (measured === 0) return;
    setSharing(true);
    
    try {
      const report = generateTextReport(measurements, pianoName);
      const subject = `Informe d'afinació${pianoName ? ` — ${pianoName}` : ''} — ${new Date().toLocaleDateString('es-ES')}`;

      if (method === 'native' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: subject,
          text: report,
        });
      } else if (method === 'email') {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
        if (typeof window !== 'undefined') window.open(mailtoUrl);
      } else if (method === 'whatsapp') {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(report)}`;
        if (typeof window !== 'undefined') window.open(waUrl, '_blank');
      } else if (method === 'copy') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(report);
        }
      }
    } catch (err: any) {
      // L'usuari ha cancel·lat el share, no fer res
      if (err?.name !== 'AbortError') {
        console.warn('Error compartint:', err);
      }
    } finally {
      setSharing(false);
    }
  }, [measurements, pianoName, measured]);

  return (
    <View style={[styles.container, { backgroundColor: bgSurface, borderColor: bgBorder }]}>
      <ThemedText style={[styles.title, { color: fgText }]}>
        Compartir informe
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: fgMuted }]}>
        {measured > 0
          ? `${measured} tecles mesurades — llest per compartir`
          : 'Mesura algunes tecles primer'
        }
      </ThemedText>

      <View style={styles.buttonsRow}>
        {/* Web Share API (mòbil) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Pressable
            onPress={() => handleShare('native')}
            disabled={measured === 0 || sharing}
            style={({ pressed }) => [
              styles.shareButton,
              { backgroundColor: '#003a8c', opacity: (pressed || measured === 0) ? 0.5 : 1 },
            ]}
          >
            <Ionicons name="share-outline" size={18} color="#ffffff" />
            <ThemedText style={styles.shareButtonText}>Compartir</ThemedText>
          </Pressable>
        )}

        {/* Email */}
        <Pressable
          onPress={() => handleShare('email')}
          disabled={measured === 0 || sharing}
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: '#1a73e8', opacity: (pressed || measured === 0) ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="mail-outline" size={18} color="#ffffff" />
          <ThemedText style={styles.shareButtonText}>Email</ThemedText>
        </Pressable>

        {/* WhatsApp */}
        <Pressable
          onPress={() => handleShare('whatsapp')}
          disabled={measured === 0 || sharing}
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: '#25D366', opacity: (pressed || measured === 0) ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
          <ThemedText style={styles.shareButtonText}>WhatsApp</ThemedText>
        </Pressable>

        {/* Copiar */}
        <Pressable
          onPress={() => handleShare('copy')}
          disabled={measured === 0 || sharing}
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: bgBorder, opacity: (pressed || measured === 0) ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="copy-outline" size={18} color={fgText} />
          <ThemedText style={[styles.shareButtonText, { color: fgText }]}>Copiar</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Montserrat',
    lineHeight: 14,
    marginTop: 2,
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    color: '#ffffff',
  },
});
