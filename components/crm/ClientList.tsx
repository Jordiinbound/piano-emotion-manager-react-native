/**
 * Lista de Clientes CRM
 * Piano Emotion Manager
 */

import type { CRMClient, ClientTag, ClientCardProps, ClientListProps } from './ClientList.types';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClients, useTags, type ClientFilters, type ClientStatus } from '@/hooks/crm';
import { useTranslation } from '@/hooks/use-translation';

// ============================================================================
// Types
// ============================================================================

interface ClientCardProps {
  client: CRMClient;
  onPress: (client: CRMClient) => void;
}

interface FilterModalProps {
  visible: boolean;
  filters: ClientFilters;
  onApply: (filters: ClientFilters) => void;
  onClose: () => void;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const statusColors: Record<ClientStatus, { bg: string; text: string }> = {
  lead: { bg: '#fef3c7', text: '#d97706' },
  active: { bg: '#d1fae5', text: '#059669' },
  inactive: { bg: '#e5e7eb', text: '#6b7280' },
  vip: { bg: '#ddd6fe', text: '#7c3aed' },
  churned: { bg: '#fee2e2', text: '#dc2626' },
};

const StatusBadge: React.FC<{ status: ClientStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const colors = statusColors[status] || statusColors.active;

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusText, { color: colors.text }]}>
        {t(`crm.status.${status}`)}
      </Text>
    </View>
  );
};

// ============================================================================
// Client Card Component
// ============================================================================

const ClientCard: React.FC<ClientCardProps> = ({ client, onPress }) => {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <TouchableOpacity style={styles.clientCard} onPress={() => onPress(client)}>
      <View style={styles.clientHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.avatarText}>
            {client.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
        </View>
        <StatusBadge status={client.profile?.status || 'active'} />
      </View>

      <View style={styles.clientStats}>
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={14} color="#6b7280" />
          <Text style={styles.statValue}>{client.profile?.score || 0}</Text>
          <Text style={styles.statLabel}>{t('crm.score')}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={14} color="#6b7280" />
          <Text style={styles.statValue}>
            {formatCurrency(client.profile?.lifetimeValue || 0)}
          </Text>
          <Text style={styles.statLabel}>{t('crm.lifetime')}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="construct-outline" size={14} color="#6b7280" />
          <Text style={styles.statValue}>{client.profile?.totalServices || 0}</Text>
          <Text style={styles.statLabel}>{t('crm.services')}</Text>
        </View>
      </View>

      {client.profile?.tags && client.profile.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {client.profile.tags.slice(0, 3).map((tag: ClientTag) => (
            <View
              key={tag.id}
              style={[styles.tag, { backgroundColor: tag.color + '20' }]}
            >
              <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
            </View>
          ))}
          {client.profile.tags.length > 3 && (
            <Text style={styles.moreTags}>+{client.profile.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface ClientListProps {
  onSelectClient: (client: CRMClient) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ onSelectClient }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    clients,
    total,
    isLoading,
    refetch,
    filters,
    updateFilters,
    clearFilters,
    page,
    goToPage,
    totalPages,
  } = useClients();

  const { tags } = useTags();

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    updateFilters({ search: text || undefined });
  }, [updateFilters]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('crm.searchClients')}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter-outline" size={18} color="#3b82f6" />
          <Text style={styles.filterButtonText}>{t('crm.filters')}</Text>
        </TouchableOpacity>

        {/* Quick Status Filters */}
        <ScrollableStatusFilters
          selectedStatuses={filters.status || []}
          onToggle={(status) => {
            const current = filters.status || [];
            const updated = current.includes(status)
              ? current.filter((s) => s !== status)
              : [...current, status];
            updateFilters({ status: updated.length > 0 ? updated : undefined });
          }}
        />
      </View>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {t('crm.showingResults', { count: clients.length, total })}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>{t('crm.noClients')}</Text>
      <Text style={styles.emptySubtitle}>{t('crm.noClientsDesc')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ClientCard client={item} onPress={onSelectClient} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => goToPage(page - 1)}
            disabled={page === 1}
          >
            <Ionicons name="chevron-back" size={20} color={page === 1 ? '#d1d5db' : '#3b82f6'} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {page} / {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => goToPage(page + 1)}
            disabled={page === totalPages}
          >
            <Ionicons name="chevron-forward" size={20} color={page === totalPages ? '#d1d5db' : '#3b82f6'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Scrollable Status Filters
// ============================================================================

const ScrollableStatusFilters: React.FC<{
  selectedStatuses: ClientStatus[];
  onToggle: (status: ClientStatus) => void;
}> = ({ selectedStatuses, onToggle }) => {
  const { t } = useTranslation();
  const statuses: ClientStatus[] = ['lead', 'active', 'inactive', 'vip', 'churned'];

  return (
    <View style={styles.statusFilters}>
      {statuses.map((status) => {
        const isSelected = selectedStatuses.includes(status);
        const colors = statusColors[status];

        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusFilterButton,
              isSelected && { backgroundColor: colors.bg, borderColor: colors.text },
            ]}
            onPress={() => onToggle(status)}
          >
            <Text
              style={[
                styles.statusFilterText,
                isSelected && { color: colors.text },
              ]}
            >
              {t(`crm.status.${status}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  filterButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 4,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  statusFilterText: {
    fontSize: 12,
    color: '#6b7280',
  },
  resultsCount: {
    marginTop: 12,
    fontSize: 13,
    color: '#6b7280',
  },
  clientCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  clientEmail: {
    fontSize: 13,
    color: '#6b7280',
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
  clientStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    color: '#9ca3af',
    alignSelf: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  pageButton: {
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default ClientList;
