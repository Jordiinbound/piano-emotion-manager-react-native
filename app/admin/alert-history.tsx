/**
 * Alert History Screen
 * Historial completo de alertas con filtros y búsqueda
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserRole } from '@/hooks/use-user-role';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AlertHistoryItem {
  id: number;
  pianoId: number;
  clientId: number;
  alertType: 'tuning' | 'regulation' | 'repair';
  priority: 'urgent' | 'pending';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  daysSinceLastService: number;
  message: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  dismissedAt?: Date;
  updatedAt: Date;
  piano: {
    brand: string;
    model: string;
    serialNumber?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export default function AlertHistoryScreen() {
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  // Verificar permisos
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, roleLoading, router]);

  // Cargar historial de alertas
  useEffect(() => {
    loadAlertHistory();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [alerts, searchQuery, statusFilter, priorityFilter, typeFilter, dateRangeFilter]);

  const loadAlertHistory = async () => {
    try {
      setLoading(true);
      // Aquí iría la llamada a la API
      // const response = await trpc.alerts.getAllHistory.query();
      // setAlerts(response);
      
      // Por ahora, datos de ejemplo
      setAlerts([]);
    } catch (error) {
      console.error('Error loading alert history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.piano.brand.toLowerCase().includes(query) ||
        alert.piano.model.toLowerCase().includes(query) ||
        alert.client.name.toLowerCase().includes(query) ||
        alert.piano.serialNumber?.toLowerCase().includes(query)
      );
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Filtro de prioridad
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.priority === priorityFilter);
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.alertType === typeFilter);
    }

    // Filtro de rango de fechas
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRangeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(filterDate.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(filterDate.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(alert => new Date(alert.createdAt) >= filterDate);
    }

    setFilteredAlerts(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#dc3545';
      case 'acknowledged':
        return '#ffc107';
      case 'resolved':
        return '#28a745';
      case 'dismissed':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'acknowledged':
        return 'Reconocida';
      case 'resolved':
        return 'Resuelta';
      case 'dismissed':
        return 'Descartada';
      default:
        return status;
    }
  };

  const getPriorityText = (priority: string) => {
    return priority === 'urgent' ? 'Urgente' : 'Pendiente';
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'tuning':
        return 'Afinación';
      case 'regulation':
        return 'Regulación';
      case 'repair':
        return 'Reparación';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateResolutionTime = (alert: AlertHistoryItem) => {
    if (!alert.resolvedAt) return null;
    
    const created = new Date(alert.createdAt).getTime();
    const resolved = new Date(alert.resolvedAt).getTime();
    const days = Math.round((resolved - created) / (1000 * 60 * 60 * 24));
    
    return days;
  };

  const renderFilterButtons = () => (
    <View style={styles.filtersContainer}>
      {/* Filtro de estado */}
      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>Estado:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'active', 'acknowledged', 'resolved', 'dismissed'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {status === 'all' ? 'Todas' : getStatusText(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtro de prioridad */}
      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>Prioridad:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'urgent', 'pending'].map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterButton,
                priorityFilter === priority && styles.filterButtonActive,
              ]}
              onPress={() => setPriorityFilter(priority)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  priorityFilter === priority && styles.filterButtonTextActive,
                ]}
              >
                {priority === 'all' ? 'Todas' : getPriorityText(priority)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtro de tipo */}
      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>Tipo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'tuning', 'regulation', 'repair'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                typeFilter === type && styles.filterButtonActive,
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  typeFilter === type && styles.filterButtonTextActive,
                ]}
              >
                {type === 'all' ? 'Todos' : getTypeText(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtro de fecha */}
      <View style={styles.filterGroup}>
        <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>Período:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { value: 'all', label: 'Todo' },
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mes' },
            { value: 'quarter', label: 'Trimestre' },
            { value: 'year', label: 'Año' },
          ].map(range => (
            <TouchableOpacity
              key={range.value}
              style={[
                styles.filterButton,
                dateRangeFilter === range.value && styles.filterButtonActive,
              ]}
              onPress={() => setDateRangeFilter(range.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dateRangeFilter === range.value && styles.filterButtonTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderAlertCard = (alert: AlertHistoryItem) => {
    const resolutionTime = calculateResolutionTime(alert);

    return (
      <TouchableOpacity
        key={alert.id}
        style={[styles.alertCard, isDark && styles.alertCardDark]}
        onPress={() => router.push(`/piano/${alert.pianoId}`)}
      >
        <View style={styles.alertHeader}>
          <View style={styles.alertBadges}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(alert.status) }]}>
              <Text style={styles.badgeText}>{getStatusText(alert.status)}</Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: alert.priority === 'urgent' ? '#dc3545' : '#ffc107' }
            ]}>
              <Text style={styles.badgeText}>{getPriorityText(alert.priority)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#6c757d' }]}>
              <Text style={styles.badgeText}>{getTypeText(alert.alertType)}</Text>
            </View>
          </View>
          <Text style={[styles.alertDate, isDark && styles.alertDateDark]}>
            {formatDate(alert.createdAt)}
          </Text>
        </View>

        <Text style={[styles.alertTitle, isDark && styles.alertTitleDark]}>
          {alert.piano.brand} {alert.piano.model}
        </Text>
        {alert.piano.serialNumber && (
          <Text style={[styles.alertSubtitle, isDark && styles.alertSubtitleDark]}>
            S/N: {alert.piano.serialNumber}
          </Text>
        )}
        <Text style={[styles.alertSubtitle, isDark && styles.alertSubtitleDark]}>
          Cliente: {alert.client.name}
        </Text>

        <Text style={[styles.alertMessage, isDark && styles.alertMessageDark]}>
          {alert.message}
        </Text>

        <View style={styles.alertFooter}>
          <Text style={[styles.alertDays, isDark && styles.alertDaysDark]}>
            {alert.daysSinceLastService} días desde último servicio
          </Text>
          {resolutionTime !== null && (
            <Text style={[styles.resolutionTime, isDark && styles.resolutionTimeDark]}>
              Resuelto en {resolutionTime} día{resolutionTime !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (roleLoading || loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            Historial de Alertas
          </Text>
        </View>

        {/* Barra de búsqueda */}
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Buscar por piano, cliente o número de serie..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtros */}
        {renderFilterButtons()}

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, isDark && styles.statBoxDark]}>
            <Text style={[styles.statNumber, isDark && styles.statNumberDark]}>
              {filteredAlerts.length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
              Total
            </Text>
          </View>
          <View style={[styles.statBox, isDark && styles.statBoxDark]}>
            <Text style={[styles.statNumber, isDark && styles.statNumberDark]}>
              {filteredAlerts.filter(a => a.status === 'resolved').length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
              Resueltas
            </Text>
          </View>
          <View style={[styles.statBox, isDark && styles.statBoxDark]}>
            <Text style={[styles.statNumber, isDark && styles.statNumberDark]}>
              {filteredAlerts.filter(a => a.status === 'active').length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>
              Activas
            </Text>
          </View>
        </View>

        {/* Lista de alertas */}
        <View style={styles.alertsList}>
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                No se encontraron alertas
              </Text>
            </View>
          ) : (
            filteredAlerts.map(renderAlertCard)
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    padding: 15,
    borderRadius: 4,
  },
  searchContainerDark: {
    backgroundColor: '#2a2a2a',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  searchInputDark: {
    color: '#fff',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterGroup: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterLabelDark: {
    color: '#ccc',
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  statBoxDark: {
    backgroundColor: '#2a2a2a',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statNumberDark: {
    color: '#667eea',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statLabelDark: {
    color: '#ccc',
  },
  alertsList: {
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 4,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertCardDark: {
    backgroundColor: '#2a2a2a',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
  },
  alertDateDark: {
    color: '#ccc',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  alertTitleDark: {
    color: '#fff',
  },
  alertSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  alertSubtitleDark: {
    color: '#ccc',
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  alertMessageDark: {
    color: '#ddd',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  alertDays: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
  },
  alertDaysDark: {
    color: '#ff6b6b',
  },
  resolutionTime: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  resolutionTimeDark: {
    color: '#51cf66',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  emptyTextDark: {
    color: '#666',
  },
});
