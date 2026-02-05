/**
 * Vista de Tienda con Control de Acceso
 * Piano Emotion Manager
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShops, useShopProducts, useCart, useShopAccess, useShopBlog } from '@/hooks/shop';
import { useTranslation } from '@/hooks/use-translation';
import { BlogSection } from './BlogSection';

// ============================================================================
// Types
// ============================================================================

interface Product {
  id: number;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  inStock: boolean;
  category?: string;
}

interface Shop {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
}

// ============================================================================
// Shop Selector
// ============================================================================

interface ShopSelectorProps {
  shops: Shop[];
  selectedShopId: number | null;
  onSelect: (shopId: number) => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({ shops, selectedShopId, onSelect }) => {
  const { t } = useTranslation();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shopSelector}>
      {shops.map((shop) => (
        <TouchableOpacity
          key={shop.id}
          style={[
            styles.shopCard,
            selectedShopId === shop.id && styles.shopCardSelected,
          ]}
          onPress={() => onSelect(shop.id)}
        >
          {shop.logoUrl ? (
            <Image source={{ uri: shop.logoUrl }} style={styles.shopLogo} />
          ) : (
            <View style={[styles.shopLogoPlaceholder, { backgroundColor: shop.color || '#3b82f6' }]}>
              <Ionicons name="storefront" size={24} color="#fff" />
            </View>
          )}
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          {shop.type === 'distributor' && (
            <View style={styles.distributorBadge}>
              <Text style={styles.distributorBadgeText}>{t('shop.official')}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// ============================================================================
// Access Denied View
// ============================================================================

const AccessDeniedView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.accessDenied}>
      <Ionicons name="lock-closed" size={64} color="#9ca3af" />
      <Text style={styles.accessDeniedTitle}>{t('shop.accessDenied')}</Text>
      <Text style={styles.accessDeniedText}>{t('shop.accessDeniedDesc')}</Text>
    </View>
  );
};

// ============================================================================
// Product Card
// ============================================================================

interface ProductCardProps {
  product: Product;
  canOrder: boolean;
  onAddToCart: () => void;
  isAdding: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, canOrder, onAddToCart, isAdding }) => {
  const { t } = useTranslation();

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(price));
  };

  return (
    <View style={styles.productCard}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="cube-outline" size={40} color="#d1d5db" />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.category && (
          <Text style={styles.productCategory}>{product.category}</Text>
        )}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          {canOrder && product.inStock && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddToCart}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          {!product.inStock && (
            <Text style={styles.outOfStock}>{t('shop.outOfStock')}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// Cart Summary
// ============================================================================

interface CartSummaryProps {
  itemCount: number;
  total: number;
  onViewCart: () => void;
}

const CartSummary: React.FC<CartSummaryProps> = ({ itemCount, total, onViewCart }) => {
  const { t } = useTranslation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  if (itemCount === 0) return null;

  return (
    <TouchableOpacity style={styles.cartSummary} onPress={onViewCart}>
      <View style={styles.cartBadge}>
        <Ionicons name="cart" size={24} color="#fff" />
        <View style={styles.cartCount}>
          <Text style={styles.cartCountText}>{itemCount}</Text>
        </View>
      </View>
      <View style={styles.cartInfo}>
        <Text style={styles.cartLabel}>{t('shop.viewCart')}</Text>
        <Text style={styles.cartTotal}>{formatPrice(total)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

// ============================================================================
// Approval Required Banner
// ============================================================================

interface ApprovalBannerProps {
  requiresApproval: boolean;
}

const ApprovalBanner: React.FC<ApprovalBannerProps> = ({ requiresApproval }) => {
  const { t } = useTranslation();

  if (!requiresApproval) return null;

  return (
    <View style={styles.approvalBanner}>
      <Ionicons name="information-circle" size={20} color="#d97706" />
      <Text style={styles.approvalBannerText}>{t('shop.approvalRequired')}</Text>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ShopView: React.FC = () => {
  const { t } = useTranslation();
  const { shops, isLoading: shopsLoading } = useShops();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'blog'>('products');

  // Seleccionar primera tienda por defecto
  React.useEffect(() => {
    if (shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  const { access, canView, canOrder, isLoading: accessLoading } = useShopAccess(selectedShopId);
  const { products, isLoading: productsLoading } = useShopProducts(selectedShopId);
  const { items, total, itemCount, addToCart, isAddingToCart, orderRequiresApproval } = useCart(selectedShopId);
  const { posts, isLoading: blogLoading, refetch: refetchBlog } = useShopBlog(selectedShopId, 10);

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart(productId, 1);
    } catch (error: unknown) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  if (shopsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (shops.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="storefront-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>{t('shop.noShops')}</Text>
        <Text style={styles.emptyText}>{t('shop.noShopsDesc')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selector de tiendas - solo mostrar si hay más de una tienda */}
      {shops.length > 1 && (
        <ShopSelector
          shops={shops}
          selectedShopId={selectedShopId}
          onSelect={setSelectedShopId}
        />
      )}

      {/* Banner de aprobación requerida */}
      <ApprovalBanner requiresApproval={orderRequiresApproval} />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="cube-outline"
            size={20}
            color={activeTab === 'products' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            Productos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blog' && styles.tabActive]}
          onPress={() => setActiveTab('blog')}
        >
          <Ionicons
            name="newspaper-outline"
            size={20}
            color={activeTab === 'blog' ? '#3b82f6' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'blog' && styles.tabTextActive]}>
            Blog
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      {accessLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : !canView ? (
        <AccessDeniedView />
      ) : activeTab === 'products' ? (
        <ScrollView style={styles.productsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product as Product}
                canOrder={canOrder}
                onAddToCart={() => handleAddToCart(product.id)}
                isAdding={isAddingToCart}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <BlogSection
          posts={posts}
          isLoading={blogLoading}
          onRefresh={refetchBlog}
        />
      )}

      {/* Resumen del carrito */}
      {canOrder && (
        <CartSummary
          itemCount={itemCount}
          total={total}
          onViewCart={() => setShowCart(true)}
        />
      )}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  // Shop Selector
  shopSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  shopCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f9fafb',
  },
  shopCardSelected: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  shopLogo: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  shopLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  distributorBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  distributorBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  // Access Denied
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  // Approval Banner
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    gap: 8,
  },
  approvalBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  // Products
  productsContainer: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: '50%',
    padding: 8,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    marginTop: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  productCategory: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStock: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  // Cart Summary
  cartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    gap: 12,
  },
  cartBadge: {
    position: 'relative',
  },
  cartCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cartInfo: {
    flex: 1,
  },
  cartLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default ShopView;
