import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { BorderRadius, Spacing } from '@/constants/theme';


// Tipos de datos
interface ContractService {
  name: string;
  date?: string;
  included?: boolean;
}

interface Contract {
  id: string;
  clientName: string;
  type: string;
  status: keyof typeof CONTRACT_STATUS;
  startDate: string;
  endDate: string;
  price: number;
  servicesUsed: ContractService[];
  servicesRemaining: number;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  services: ContractService[];
}
// Tipos de contrato
const CONTRACT_TYPES = [
  { id: 'basic', name: 'Básico', color: '#6B7280', icon: 'document-outline' },
  { id: 'standard', name: 'Estándar', color: '#3B82F6', icon: 'document-text-outline' },
  { id: 'premium', name: 'Premium', color: '#F59E0B', icon: 'star-outline' },
  { id: 'professional', name: 'Profesional', color: '#8B5CF6', icon: 'diamond-outline' },
];

// Estados de contrato
const CONTRACT_STATUS = {
  draft: { name: 'Borrador', color: '#6B7280' },
  pending: { name: 'Pendiente', color: '#F59E0B' },
  active: { name: 'Activo', color: '#10B981' },
  suspended: { name: 'Suspendido', color: '#EF4444' },
  expired: { name: 'Expirado', color: '#6B7280' },
  cancelled: { name: 'Cancelado', color: '#EF4444' },
};

// Plantillas predefinidas
const CONTRACT_TEMPLATES = [
  {
    id: 'basic',
    name: 'Mantenimiento Básico',
    description: 'Ideal para pianos de uso doméstico ocasional',
    type: 'basic',
    price: 150,
    services: [
      { name: '1 afinación anual', included: true },
      { name: '10% descuento en servicios adicionales', included: true },
    ],
  },
  {
    id: 'standard',
    name: 'Mantenimiento Estándar',
    description: 'Recomendado para pianos de uso regular',
    type: 'standard',
    price: 280,
    services: [
      { name: '2 afinaciones anuales', included: true },
      { name: '1 inspección anual', included: true },
      { name: '15% descuento en servicios adicionales', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Mantenimiento Premium',
    description: 'Para pianos de uso intensivo o de alta gama',
    type: 'premium',
    price: 550,
    services: [
      { name: '4 afinaciones anuales', included: true },
      { name: '1 regulación anual', included: true },
      { name: 'Reparaciones menores ilimitadas', included: true },
      { name: '20% descuento en servicios adicionales', included: true },
    ],
  },
  {
    id: 'professional',
    name: 'Mantenimiento Profesional',
    description: 'Para profesionales, escuelas y conservatorios',
    type: 'professional',
    price: 1200,
    services: [
      { name: 'Afinaciones ilimitadas', included: true },
      { name: '2 regulaciones anuales', included: true },
      { name: '1 armonización anual', included: true },
      { name: 'Reparaciones menores ilimitadas', included: true },
      { name: 'Soporte prioritario 24/7', included: true },
      { name: '25% descuento en servicios adicionales', included: true },
    ],
  },
];

// Contratos de ejemplo
const SAMPLE_CONTRACTS = [
  {
    id: '1',
    contractNumber: 'CTR-2024-0001',
    clientName: 'María García',
    pianoName: 'Yamaha C3',
    name: 'Mantenimiento Premium',
    type: 'premium',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    price: 550,
    servicesUsed: [
      { type: 'tuning', used: 2, total: 4 },
      { type: 'regulation', used: 0, total: 1 },
    ],
    nextBilling: '2024-07-01',
  },
  {
    id: '2',
    contractNumber: 'CTR-2024-0002',
    clientName: 'Carlos López',
    pianoName: 'Steinway Model D',
    name: 'Mantenimiento Profesional',
    type: 'professional',
    status: 'active',
    startDate: '2024-02-15',
    endDate: '2025-02-14',
    price: 1200,
    servicesUsed: [
      { type: 'tuning', used: 5, total: -1 }, // -1 = ilimitado
      { type: 'regulation', used: 1, total: 2 },
    ],
    nextBilling: '2024-08-15',
  },
  {
    id: '3',
    contractNumber: 'CTR-2023-0015',
    clientName: 'Ana Martínez',
    pianoName: 'Kawai GL-10',
    name: 'Mantenimiento Estándar',
    type: 'standard',
    status: 'expired',
    startDate: '2023-03-01',
    endDate: '2024-02-29',
    price: 280,
    servicesUsed: [
      { type: 'tuning', used: 2, total: 2 },
      { type: 'inspection', used: 1, total: 1 },
    ],
    nextBilling: null,
  },
];

export default function ContractsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [contracts, setContracts] = useState(SAMPLE_CONTRACTS);
  const [filter, setFilter] = useState<string>('all');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const textPrimary = colors.text;
  const textSecondary = colors.textSecondary;
  const background = colors.background;
  const cardBg = colors.card;
  const border = colors.border;

  const getTypeInfo = (typeId: string) => {
    return CONTRACT_TYPES.find(t => t.id === typeId) || CONTRACT_TYPES[0];
  };

  const getStatusInfo = (statusId: string) => {
    return CONTRACT_STATUS[statusId as keyof typeof CONTRACT_STATUS] || CONTRACT_STATUS.draft;
  };

  const filteredContracts = contracts.filter(contract => {
    if (filter !== 'all' && contract.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        contract.clientName.toLowerCase().includes(query) ||
        contract.pianoName.toLowerCase().includes(query) ||
        contract.contractNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const renderStats = () => {
    const activeCount = contracts.filter(c => c.status === 'active').length;
    const totalRevenue = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.price, 0);
    const expiringCount = contracts.filter(c => {
      if (c.status !== 'active') return false;
      const endDate = new Date(c.endDate);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return endDate <= nextMonth;
    }).length;

    return (
      <View style={[styles.statsContainer, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
            {activeCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Activos
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: colors.primary }]}>
            {totalRevenue}€
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Ingresos/año
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: expiringCount > 0 ? '#F59E0B' : textSecondary }]}>
            {expiringCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: textSecondary }]}>
            Por renovar
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={{ alignItems: 'center' }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { id: 'all', name: 'Todos' },
          { id: 'active', name: 'Activos' },
          { id: 'pending', name: 'Pendientes' },
          { id: 'expired', name: 'Expirados' },
        ].map(f => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === f.id ? colors.primary : cardBg,
                borderColor: filter === f.id ? colors.primary : border,
                borderRadius: 4
              }
            ]}
            onPress={() => setFilter(f.id)}
          >
            <ThemedText style={[
              styles.filterChipText,
              { color: filter === f.id ? '#fff' : textSecondary }
            ]}>
              {f.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContractCard = (contract: Contract) => {
    const typeInfo = getTypeInfo(contract.type);
    const statusInfo = getStatusInfo(contract.status);
    const daysUntilEnd = Math.ceil(
      (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <TouchableOpacity
        key={contract.id}
        style={[styles.contractCard, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => router.push(`/contracts/${contract.id}`)}
      >
        <View style={styles.contractHeader}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
            <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
          </View>
          <View style={styles.contractInfo}>
            <ThemedText style={[styles.contractNumber, { color: textSecondary }]}>
              {(contract as any).contractNumber}
            </ThemedText>
            <ThemedText style={[styles.contractName, { color: textPrimary }]}>
              {(contract as any).name}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.name}
            </ThemedText>
          </View>
        </View>

        <View style={styles.contractDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={textSecondary} />
            <ThemedText style={[styles.detailText, { color: textSecondary }]}>
              {(contract as any).clientName}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="musical-notes-outline" size={14} color={textSecondary} />
            <ThemedText style={[styles.detailText, { color: textSecondary }]}>
              {(contract as any).pianoName}
            </ThemedText>
          </View>
        </View>

        {/* Uso de servicios */}
        {contract.status === 'active' && (
          <View style={styles.servicesUsage}>
            {((contract as any).servicesUsed || []).map((service: any, index: number) => (
              <View key={index} style={styles.serviceUsageItem}>
                <ThemedText style={[styles.serviceUsageLabel, { color: textSecondary }]}>
                  {service.type === 'tuning' ? 'Afinaciones' : 
                   service.type === 'regulation' ? 'Regulaciones' : 
                   service.type === 'inspection' ? 'Inspecciones' : (service.type || 'Servicio')}
                </ThemedText>
                <View style={styles.serviceUsageBar}>
                  <View 
                    style={[
                      styles.serviceUsageProgress,
                      { 
                        backgroundColor: typeInfo.color,
                        width: (service.total === -1 || !service.total) ? '100%' : `${((service.used || 0) / service.total) * 100}%`
                      }
                    ]}
                  />
                </View>
                <ThemedText style={[styles.serviceUsageCount, { color: textPrimary }]}>
                  {(service.total === -1 || !service.total) ? `${service.used || 0} (∞)` : `${service.used || 0}/${service.total}`}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={[styles.contractFooter, { borderTopColor: border }]}>
          <View style={styles.footerItem}>
            <ThemedText style={[styles.footerLabel, { color: textSecondary }]}>
              Precio anual
            </ThemedText>
            <ThemedText style={[styles.footerValue, { color: textPrimary }]}>
              {contract.price}€
            </ThemedText>
          </View>
          {contract.status === 'active' && (
            <>
              <View style={[styles.footerDivider, { backgroundColor: border }]} />
              <View style={styles.footerItem}>
                <ThemedText style={[styles.footerLabel, { color: textSecondary }]}>
                  {daysUntilEnd > 0 ? 'Expira en' : 'Expirado hace'}
                </ThemedText>
                <ThemedText style={[
                  styles.footerValue,
                  { color: daysUntilEnd <= 30 ? '#F59E0B' : textPrimary }
                ]}>
                  {Math.abs(daysUntilEnd)} días
                </ThemedText>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplateCard = (template: ContractTemplate) => {
    const typeInfo = getTypeInfo(template.type);

    return (
      <TouchableOpacity
        key={template.id}
        style={[styles.templateCard, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => {
          setShowTemplatesModal(false);
          router.push(`/contracts/new?template=${template.id}`);
        }}
      >
        <View style={styles.templateHeader}>
          <View style={[styles.templateIcon, { backgroundColor: `${typeInfo.color}20` }]}>
            <Ionicons name={typeInfo.icon as any} size={28} color={typeInfo.color} />
          </View>
          <View style={styles.templateInfo}>
            <ThemedText style={[styles.templateName, { color: textPrimary }]}>
              {template.name}
            </ThemedText>
            <ThemedText style={[styles.templatePrice, { color: typeInfo.color }]}>
              {template.price}€/año
            </ThemedText>
          </View>
        </View>
        
        <ThemedText style={[styles.templateDescription, { color: textSecondary }]}>
          {template.description}
        </ThemedText>

        <View style={styles.templateServices}>
          {((template as any).services || []).map((service: any, index: number) => (
            <View key={index} style={styles.templateServiceItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color="#10B981" 
              />
              <ThemedText style={[styles.templateServiceText, { color: textSecondary }]}>
                {service.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Contratos' }} />
      <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ color: textPrimary }}>
          Contratos
        </ThemedText>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowTemplatesModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas */}
        {renderStats()}

        {/* Búsqueda */}
        <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="search-outline" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Buscar contratos..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        {renderFilters()}

        {/* Lista de contratos */}
        <View style={styles.contractsList}>
          {filteredContracts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="document-text-outline" size={48} color={textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: textPrimary }]}>
                No hay contratos
              </ThemedText>
              <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
                Crea tu primer contrato de mantenimiento para fidelizar a tus clientes
              </ThemedText>
            </View>
          ) : (
            filteredContracts.map((contract: any) => renderContractCard(contract))
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoTitle, { color: colors.primary }]}>
              Contratos de Mantenimiento
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: textSecondary }]}>
              Los contratos de mantenimiento te permiten ofrecer planes de servicios recurrentes 
              con facturación automática. Fideliza a tus clientes y asegura ingresos estables.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Modal de plantillas */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
              <ThemedText style={{ color: colors.primary }}>Cancelar</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" style={{ color: textPrimary }}>
              Nuevo Contrato
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <ThemedText style={[styles.modalLabel, { color: textSecondary }]}>
              Selecciona una plantilla para empezar
            </ThemedText>
            
            {CONTRACT_TEMPLATES.map(renderTemplateCard)}

            <TouchableOpacity
              style={[styles.customButton, { borderColor: colors.primary }]}
              onPress={() => {
                setShowTemplatesModal(false);
                router.push('/contracts/new');
              }}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <ThemedText style={[styles.customButtonText, { color: colors.primary }]}>
                Crear contrato personalizado
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
    </>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
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
  statDivider: {
    width: 1,
    height: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contractsList: {
    paddingHorizontal: 16,
  },
  contractCard: {
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contractNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  contractName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contractDetails: {
    paddingHorizontal: 16,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  servicesUsage: {
    padding: 16,
    gap: 10,
  },
  serviceUsageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceUsageLabel: {
    fontSize: 12,
    width: 80,
  },
  serviceUsageBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  serviceUsageProgress: {
    height: '100%',
    borderRadius: 4,
  },
  serviceUsageCount: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  contractFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  footerDivider: {
    width: 1,
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 4,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  templateCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '600',
  },
  templatePrice: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  templateDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  templateServices: {
    gap: 6,
  },
  templateServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateServiceText: {
    fontSize: 13,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  customButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
