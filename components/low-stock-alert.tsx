import React from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { ThemedText } from './themed-text';
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
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
          <ThemedText style={styles.headerTitle}>{items.length} {items.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición</ThemedText>
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
                <ThemedText style={styles.itemName} numberOfLines={1}>{item.name}</ThemedText>
                <View style={styles.itemMeta}>
                  <ThemedText style={styles.itemStock}>
                    {item.quantity} / {item.minStock} {item.unit}
                  </ThemedText>
                  {supplier && (
                    <ThemedText style={styles.supplierName} numberOfLines={1}>
                      · {supplier.name}
                    </ThemedText>
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
                <ThemedText style={styles.orderButtonText}>{getOrderButtonText(item)}</ThemedText>
              </Pressable>
            </View>
          );
        })}
      </View>

      {items.length > 5 && (
        <ThemedText style={styles.moreItems}>
          +{items.length - 5} más
        </ThemedText>
      )}
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
      <ThemedText style={[styles.orderFromStoreText, isSmall && styles.orderFromStoreTextSmall]}>
        {buttonText}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  itemStock: {
    fontSize: 13,
    color: '#6B7280',
  },
  supplierName: {
    fontSize: 12,
    color: '#9CA3AF',
    maxWidth: 100,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e07a5f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 4,
    shadowColor: '#e07a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  orderButtonSupplier: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
  },
  orderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreItems: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
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
    shadowColor: '#5B9A8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
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
