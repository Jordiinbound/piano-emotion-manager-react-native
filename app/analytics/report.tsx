/**
 * Generación de Reportes PDF
 * Permite exportar un resumen de analíticas en formato PDF
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientsData, usePianosData, useServicesData, useAppointmentsData } from '@/hooks/data';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSettings } from '@/hooks/use-settings';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import {
  calculateAllAnalytics,
  formatCurrency,
  AnalyticsData,
} from '@/services/analytics-service';

type ReportPeriod = 'month' | 'quarter' | 'year';

export default function ReportScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [generating, setGenerating] = useState(false);
  const [includeClients, setIncludeClients] = useState(true);
  const [includeServices, setIncludeServices] = useState(true);
  const [includeRevenue, setIncludeRevenue] = useState(true);
  const [includePianos, setIncludePianos] = useState(true);

  const { clients } = useClientsData();
  const { pianos } = usePianosData();
  const { services } = useServicesData();
  const { appointments } = useAppointmentsData();
  const { settings } = useSettings();

  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');

  // Calcular analíticas
  const analytics: AnalyticsData = useMemo(() => {
    return calculateAllAnalytics(clients, services, pianos, appointments);
  }, [clients, services, pianos, appointments]);

  // Generar HTML para el PDF
  const generateReportHTML = useCallback(() => {
    const now = new Date();
    const periodLabels: Record<ReportPeriod, string> = {
      month: 'Mensual',
      quarter: 'Trimestral',
      year: 'Anual',
    };

    const businessName = settings?.businessName || 'Piano Emotion Manager';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #333;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4A90A4;
          }
          .header h1 {
            font-size: 28px;
            color: #4A90A4;
            margin-bottom: 8px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            font-size: 18px;
            color: #4A90A4;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #E5E5E5;
          }
          .kpi-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 24px;
          }
          .kpi-card {
            flex: 1;
            min-width: 120px;
            background: #F8F9FA;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
          }
          .kpi-value {
            font-size: 24px;
            font-weight: 700;
            color: #4A90A4;
          }
          .kpi-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          .table th, .table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #E5E5E5;
          }
          .table th {
            background: #F8F9FA;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
          }
          .table td {
            font-size: 14px;
          }
          .highlight {
            color: #7CB342;
            font-weight: 600;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E5E5;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${businessName}</h1>
          <p>Reporte ${periodLabels[period]} - ${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>

        ${includeRevenue ? `
        <div class="section">
          <h2>Resumen de Ingresos</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value">${formatCurrency(analytics.kpis.revenueThisMonth)}</div>
              <div class="kpi-label">Este mes</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${formatCurrency(analytics.kpis.totalRevenue)}</div>
              <div class="kpi-label">Total histórico</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${formatCurrency(analytics.kpis.averageServicePrice)}</div>
              <div class="kpi-label">Precio medio</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.revenueGrowth >= 0 ? '+' : ''}${analytics.kpis.revenueGrowth.toFixed(1)}%</div>
              <div class="kpi-label">Crecimiento</div>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Servicios</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.monthlyTrend.slice(-6).reverse().map(m => `
                <tr>
                  <td>${m.label}</td>
                  <td>${m.services}</td>
                  <td class="highlight">${formatCurrency(m.revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${includeServices ? `
        <div class="section">
          <h2>Análisis de Servicios</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.totalServices}</div>
              <div class="kpi-label">Total servicios</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.servicesThisMonth}</div>
              <div class="kpi-label">Este mes</div>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Ingresos</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.serviceTypeStats.map(s => `
                <tr>
                  <td>${s.label}</td>
                  <td>${s.count}</td>
                  <td class="highlight">${formatCurrency(s.revenue)}</td>
                  <td>${s.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${includeClients ? `
        <div class="section">
          <h2>Análisis de Clientes</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.totalClients}</div>
              <div class="kpi-label">Total clientes</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">+${analytics.kpis.newClientsThisMonth}</div>
              <div class="kpi-label">Nuevos este mes</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.clientRetentionRate.toFixed(0)}%</div>
              <div class="kpi-label">Retención</div>
            </div>
          </div>
          <h3 style="font-size: 14px; margin: 16px 0 8px;">Top 5 Clientes</h3>
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Servicios</th>
                <th>Total gastado</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.topClients.slice(0, 5).map((c, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${c.name}</td>
                  <td>${c.totalServices}</td>
                  <td class="highlight">${formatCurrency(c.totalSpent)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${includePianos ? `
        <div class="section">
          <h2>Distribución de Pianos</h2>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value">${analytics.kpis.totalPianos}</div>
              <div class="kpi-label">Total pianos</div>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.pianoDistribution.map(p => `
                <tr>
                  <td>${p.label}</td>
                  <td>${p.count}</td>
                  <td>${p.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generado el ${now.toLocaleDateString('es-ES')} a las ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Piano Emotion Manager</p>
        </div>
      </body>
      </html>
    `;
  }, [analytics, period, includeClients, includeServices, includeRevenue, includePianos, settings]);

  // Generar y compartir PDF
  const handleGenerateReport = useCallback(async () => {
    try {
      setGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = generateReportHTML();
      const { uri } = await Print.printToFileAsync({ html });

      // Renombrar el archivo
      const now = new Date();
      const fileName = `reporte_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Reporte',
        });
      } else {
        Alert.alert('Éxito', `Reporte guardado en: ${newUri}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte');
    } finally {
      setGenerating(false);
    }
  }, [generateReportHTML]);

  const periods: { key: ReportPeriod; label: string; icon: string }[] = [
    { key: 'month', label: 'Mensual', icon: 'calendar' },
    { key: 'quarter', label: 'Trimestral', icon: 'calendar.badge.clock' },
    { key: 'year', label: 'Anual', icon: 'calendar.circle' },
  ];

  const ToggleOption = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <Pressable
      style={[styles.toggleOption, { backgroundColor: cardBg, borderColor }]}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
    >
      <ThemedText>{label}</ThemedText>
      <View style={[styles.toggle, { backgroundColor: value ? success : borderColor }]}>
        <View style={[styles.toggleKnob, { transform: [{ translateX: value ? 20 : 2 }] }]} />
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={['#F8F9FA', '#EEF2F7', '#E8EDF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <ScreenHeader
        title="Generar Reporte"
        subtitle="Exportar analíticas a PDF"
        icon="doc.text.fill"
        showBack
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Período */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Período del Reporte
          </ThemedText>
          <View style={styles.periodOptions}>
            {periods.map((p) => (
              <Pressable
                key={p.key}
                style={[
                  styles.periodOption,
                  { borderColor },
                  period === p.key && { backgroundColor: `${accent}15`, borderColor: accent },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPeriod(p.key);
                }}
              >
                <IconSymbol
                  name={p.icon as any}
                  size={24}
                  color={period === p.key ? accent : textSecondary}
                />
                <ThemedText
                  style={[
                    styles.periodLabel,
                    { color: period === p.key ? accent : textSecondary },
                  ]}
                >
                  {p.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Secciones a incluir */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Secciones a Incluir
          </ThemedText>
          <ToggleOption
            label="Ingresos"
            value={includeRevenue}
            onToggle={() => setIncludeRevenue(!includeRevenue)}
          />
          <ToggleOption
            label="Servicios"
            value={includeServices}
            onToggle={() => setIncludeServices(!includeServices)}
          />
          <ToggleOption
            label="Clientes"
            value={includeClients}
            onToggle={() => setIncludeClients(!includeClients)}
          />
          <ToggleOption
            label="Pianos"
            value={includePianos}
            onToggle={() => setIncludePianos(!includePianos)}
          />
        </View>

        {/* Vista previa */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Vista Previa
          </ThemedText>
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <ThemedText style={[styles.previewTitle, { color: accent }]}>
                Reporte {periods.find(p => p.key === period)?.label}
              </ThemedText>
              <ThemedText style={[styles.previewDate, { color: textSecondary }]}>
                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </ThemedText>
            </View>
            <View style={styles.previewSections}>
              {includeRevenue && (
                <View style={styles.previewSection}>
                  <IconSymbol name="eurosign.circle" size={16} color={success} />
                  <ThemedText style={styles.previewSectionText}>Ingresos</ThemedText>
                </View>
              )}
              {includeServices && (
                <View style={styles.previewSection}>
                  <IconSymbol name="wrench.and.screwdriver" size={16} color={accent} />
                  <ThemedText style={styles.previewSectionText}>Servicios</ThemedText>
                </View>
              )}
              {includeClients && (
                <View style={styles.previewSection}>
                  <IconSymbol name="person.2" size={16} color="#FFA726" />
                  <ThemedText style={styles.previewSectionText}>Clientes</ThemedText>
                </View>
              )}
              {includePianos && (
                <View style={styles.previewSection}>
                  <IconSymbol name="pianokeys" size={16} color="#AB47BC" />
                  <ThemedText style={styles.previewSectionText}>Pianos</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Botón generar */}
        <Pressable
          style={[styles.generateButton, { backgroundColor: accent }]}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <ThemedText style={styles.generateButtonText}>Generando...</ThemedText>
          ) : (
            <>
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <ThemedText style={styles.generateButtonText}>Generar y Compartir PDF</ThemedText>
            </>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  periodOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  preview: {
    backgroundColor: '#F8F9FA',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewDate: {
    fontSize: 12,
    marginTop: 4,
  },
  previewSections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  previewSectionText: {
    fontSize: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    ...Shadows.md,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
