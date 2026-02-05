/**
 * Dashboard Predictions Component
 * Muestra predicciones de IA
 */
import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Accordion } from '@/components/accordion';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

export const DashboardPredictions = memo(function DashboardPredictions() {
  const router = useRouter();
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <Accordion 
      title="Predicciones IA" 
      defaultOpen={false}
      icon="brain.head.profile"
      iconColor="#8B5CF6"
      rightAction={
        <Pressable 
          onPress={() => router.push('/predictions' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <ThemedText style={{ fontSize: 13, color: '#8B5CF6' }}>Ver todo</ThemedText>
          <IconSymbol name="chevron.right" size={14} color="#8B5CF6" />
        </Pressable>
      }
    >
      <View style={styles.predictionsGrid}>
        <PredictionItem 
          icon="chart.line.uptrend.xyaxis"
          iconColor="#22C55E"
          value="+12%"
          label="Ingresos prev."
        />
        <PredictionItem 
          icon="person.fill.questionmark"
          iconColor="#F59E0B"
          value="3"
          label="Clientes riesgo"
        />
        <PredictionItem 
          icon="wrench.and.screwdriver.fill"
          iconColor="#8B5CF6"
          value="5"
          label="Mant. próximo"
        />
      </View>
    </Accordion>
  );
});

interface PredictionItemProps {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
}

function PredictionItem({ icon, iconColor, value, label }: PredictionItemProps) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  
  return (
    <View style={styles.predictionItem}>
      <View style={[styles.predictionIcon, { backgroundColor: `${iconColor}20` }]}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
      </View>
      <ThemedText style={[styles.predictionValue, { color: iconColor }]}>{value}</ThemedText>
      <ThemedText style={[styles.predictionLabel, { color: textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  predictionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  predictionItem: {
    alignItems: 'center',
    gap: 4,
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  predictionLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
