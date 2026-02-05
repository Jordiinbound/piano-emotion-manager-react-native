import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import { Supplier } from '@/types/supplier';

// Mapeo de categorías de inventario a categorías de la tienda Piano Emotion
const CATEGORY_TO_STORE_MAPPING: Record<string, { storeCategory: string; searchTerm: string }> = {
  strings: { storeCategory: 'cuerdas', searchTerm: 'cuerdas piano' },
  hammers: { storeCategory: 'macillos', searchTerm: 'macillos piano' },
  felts: { storeCategory: 'fieltros', searchTerm: 'fieltros piano' },
  tools: { storeCategory: 'herramientas', searchTerm: 'herramientas piano' },
  pins: { storeCategory: 'clavijas', searchTerm: 'clavijas piano' },
  adhesives: { storeCategory: 'adhesivos', searchTerm: 'cola madera piano' },
  maintenance: { storeCategory: 'mantenimiento', searchTerm: 'mantenimiento piano' },
  parts: { storeCategory: 'repuestos', searchTerm: 'repuestos piano' },
  tuning_levers: { storeCategory: 'llaves-afinacion', searchTerm: 'llave afinacion piano' },
};

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  category?: string;
  supplierId?: string;
}

interface LowStockAlertProps {
  items: LowStockItem[];
  suppliers?: Supplier[];
  onItemPress?: (item: LowStockItem) => void;
}

export function LowStockAlert({ items, suppliers = [], onItemPress }: LowStockAlertProps) {
  if (items.length === 0) return null;

  // Obtener el proveedor de un item
  const getSupplier = (supplierId?: string): Supplier | undefined => {
    if (!supplierId) return undefined;
    return suppliers.find(s => s.id === supplierId);
  };

  // Abrir la tienda del proveedor o Piano Emotion Store
  const openStore = (item: LowStockItem) => {
    const supplier = getSupplier(item.supplierId);
    
    // Si el proveedor tiene URL de tienda, abrir esa
    if (supplier?.storeUrl) {
      Linking.openURL(supplier.storeUrl);
      return;
    }
    
    // Si no, abrir Piano Emotion Store
    const url = 'https://www.pianoemotion.es';
    Linking.openURL(url);
  };

  // Obtener el texto del botón según el proveedor
  const getOrderButtonText = (item: LowStockItem): string => {
    const supplier = getSupplier(item.supplierId);
    if (supplier?.storeUrl) {
      return supplier.name.length > 10 ? 'Pedir' : supplier.name;
    }
    return 'Pedir';
  };

  // Verificar si el item tiene proveedor con tienda
  const hasSupplierStore = (item: LowStockItem): boolean => {
    const supplier = getSupplier(item.supplierId);
    return !!supplier?.storeUrl;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#D97706" />
          <Text style={styles.headerTitle}>Stock Bajo - Reponer</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {items.slice(0, 5).map((item) => {
          const supplier = getSupplier(item.supplierId);
          const hasStore = hasSupplierStore(item);
          
          return (
            <View key={item.id} style={styles.itemRow}>
              <Pressable 
                style={styles.itemInfo}
                onPress={() => onItemPress?.(item)}
              >
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemStock}>
                    {item.quantity} / {item.minStock} {item.unit}
                  </Text>
                  {supplier && (
                    <Text style={styles.supplierName} numberOfLines={1}>
                      · {supplier.name}
                    </Text>
                  )}
                </View>
              </Pressable>
              <Pressable 
                style={[
                  styles.orderButton,
                  hasStore && styles.orderButtonSupplier
                ]}
                onPress={() => openStore(item)}
              >
                <IconSymbol name="cart.fill" size={14} color="#FFFFFF" />
                <Text style={styles.orderButtonText}>{getOrderButtonText(item)}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {items.length > 5 && (
        <Text style={styles.moreItems}>
          +{items.length - 5} materiales más con stock bajo
        </Text>
      )}

      <Pressable 
        style={styles.storeLink}
        onPress={() => Linking.openURL('https://www.pianoemotion.es')}
      >
        <View style={styles.storeLinkContent}>
          <Text style={styles.storeLinkIcon}>🎹</Text>
          <View style={styles.storeLinkText}>
            <Text style={styles.storeLinkTitle}>Piano Emotion Store</Text>
            <Text style={styles.storeLinkSubtitle}>Renner • Klinke • Röslau • Hainsworth</Text>
          </View>
        </View>
        <IconSymbol name="arrow.right" size={16} color="#5B9A8B" />
      </Pressable>
    </View>
  );
}

interface OrderButtonProps {
  item: {
    name: string;
    category?: string;
    supplierId?: string;
  };
  supplier?: Supplier;
  size?: 'small' | 'medium';
}

export function OrderFromStoreButton({ item, supplier, size = 'medium' }: OrderButtonProps) {
  const openStore = () => {
    // Si el proveedor tiene URL de tienda, abrir esa
    if (supplier?.storeUrl) {
      Linking.openURL(supplier.storeUrl);
      return;
    }
    // Si no, abrir Piano Emotion Store
    Linking.openURL('https://www.pianoemotion.es');
  };

  const isSmall = size === 'small';
  const buttonText = supplier?.storeUrl 
    ? `Pedir a ${supplier.name}` 
    : 'Pedir a Piano Emotion';

  return (
    <Pressable 
      style={[
        styles.orderFromStoreButton, 
        isSmall && styles.orderFromStoreButtonSmall,
        supplier?.storeUrl && styles.orderFromStoreButtonSupplier
      ]}
      onPress={openStore}
    >
      <IconSymbol name="cart.fill" size={isSmall ? 14 : 16} color="#FFFFFF" />
      <Text style={[styles.orderFromStoreText, isSmall && styles.orderFromStoreTextSmall]}>
        {buttonText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  badge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsList: {
    padding: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  itemStock: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  supplierName: {
    fontSize: 11,
    color: '#6B7280',
    maxWidth: 100,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B9A8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  orderButtonSupplier: {
    backgroundColor: '#3B82F6',
  },
  orderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreItems: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    paddingBottom: 12,
  },
  storeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },
  storeLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeLinkIcon: {
    fontSize: 24,
  },
  storeLinkText: {
    gap: 2,
  },
  storeLinkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  storeLinkSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  orderFromStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B9A8B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    gap: 8,
  },
  orderFromStoreButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  orderFromStoreButtonSupplier: {
    backgroundColor: '#3B82F6',
  },
  orderFromStoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderFromStoreTextSmall: {
    fontSize: 12,
  },
});

export default LowStockAlert;
