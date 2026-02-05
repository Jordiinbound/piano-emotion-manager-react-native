/**
 * Vista Moderna de Tienda
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
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
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
  brand?: string;
}

interface Shop {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  type?: string;
}

// ============================================================================
// Product Categories
// ============================================================================

const PRODUCT_CATEGORIES = [
  {
    id: 'hammers',
    name: 'Macillos',
    icon: '🎹',
    brands: ['Renner'],
    description: 'Macillos de fieltro premium para pianos de cola y verticales',
  },
  {
    id: 'strings',
    name: 'Cuerdas',
    icon: '🎵',
    brands: ['Röslau'],
    description: 'Cuerdas de acero y entorchadas de máxima calidad',
  },
  {
    id: 'felts',
    name: 'Fieltros',
    icon: '🧵',
    brands: ['Hainsworth'],
    description: 'Fieltros técnicos para mecánica y apagadores',
  },
  {
    id: 'tuning-levers',
    name: 'Llaves',
    icon: '🔑',
    brands: [],
    description: 'Llaves de afinación profesionales',
  },
  {
    id: 'tools',
    name: 'Herramientas',
    icon: '🔧',
    brands: ['Jahn', 'Pianotek'],
    description: 'Herramientas profesionales para técnicos',
  },
  {
    id: 'adhesives',
    name: 'Adhesivos',
    icon: '💧',
    brands: ['Titebond'],
    description: 'Colas profesionales para madera',
  },
  {
    id: 'maintenance',
    name: 'Mantenimiento',
    icon: '✨',
    brands: ['Cory', 'Dampp-Chaser'],
    description: 'Productos de limpieza y control de humedad',
  },
  {
    id: 'pins',
    name: 'Clavijas',
    icon: '🔩',
    brands: ['Klinke'],
    description: 'Clavijas de afinación y agrafes',
  },
];

// ============================================================================
// Components
// ============================================================================

const StoreHeader: React.FC<{ shop: Shop }> = ({ shop }) => {
  return (
    <View style={styles.storeHeader}>
      <View style={styles.storeHeaderContent}>
        {shop.logoUrl ? (
          <Image source={{ uri: shop.logoUrl }} style={styles.storeLogo} />
        ) : (
          <View style={styles.storeLogoPlaceholder}>
            <Ionicons name="storefront" size={32} color="#fff" />
          </View>
        )}
        <View style={styles.storeInfo}>
          <Text style={styles.storeTitle}>{shop.name}</Text>
          {shop.description && (
            <Text style={styles.storeDescription}>{shop.description}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const PromoBanner: React.FC = () => {
  return (
    <View style={styles.promoBanner}>
      <View style={styles.promoBannerContent}>
        <Text style={styles.promoBannerTitle}>Marcas Europeas de Prestigio</Text>
        <Text style={styles.promoBannerSubtitle}>
          Renner • Klinke • Röslau • Hainsworth
        </Text>
      </View>
      <Ionicons name="star" size={24} color="#fbbf24" />
    </View>
  );
};

interface CategoryGridProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ selectedCategory, onSelectCategory }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Categorías</Text>
      <View style={styles.categoriesGrid}>
        {PRODUCT_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategory === category.id && styles.categoryCardSelected,
            ]}
            onPress={() => onSelectCategory(
              selectedCategory === category.id ? null : category.id
            )}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedCategory && (
        <View style={styles.categoryDetail}>
          {(() => {
            const category = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
            if (!category) return null;
            return (
              <>
                <Text style={styles.categoryDetailTitle}>{category.name}</Text>
                <Text style={styles.categoryDetailDescription}>{category.description}</Text>
                {category.brands.length > 0 && (
                  <View style={styles.brandsContainer}>
                    <Text style={styles.brandsLabel}>Marcas disponibles:</Text>
                    <View style={styles.brandsList}>
                      {category.brands.map((brand, index) => (
                        <View key={index} style={styles.brandTag}>
                          <Text style={styles.brandTagText}>{brand}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
};

interface ProductsGridProps {
  products: Product[];
  canOrder: boolean;
  onAddToCart: (productId: number) => void;
  isAdding: boolean;
}

const ProductsGrid: React.FC<ProductsGridProps> = ({ products, canOrder, onAddToCart, isAdding }) => {
  if (products.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cube-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyStateTitle}>No hay productos disponibles</Text>
        <Text style={styles.emptyStateText}>Los productos aparecerán aquí cuando estén disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.productsGrid}>
      {products.map((product) => (
        <View key={product.id} style={styles.productCard}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9ca3af" />
            </View>
          )}
          <View style={styles.productInfo}>
            {product.brand && (
              <Text style={styles.productBrand}>{product.brand}</Text>
            )}
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            {product.category && (
              <Text style={styles.productCategory}>{product.category}</Text>
            )}
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>{product.price}</Text>
              {product.inStock && canOrder ? (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddToCart(product.id)}
                  disabled={isAdding}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <Text style={styles.outOfStock}>Agotado</Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const ApprovalBanner: React.FC<{ requiresApproval: boolean }> = ({ requiresApproval }) => {
  if (!requiresApproval) return null;

  return (
    <View style={styles.approvalBanner}>
      <Ionicons name="information-circle" size={20} color="#92400e" />
      <Text style={styles.approvalBannerText}>
        Tus pedidos requieren aprobación antes de ser procesados
      </Text>
    </View>
  );
};

const CartSummary: React.FC<{
  itemCount: number;
  total: string;
  onPress: () => void;
}> = ({ itemCount, total, onPress }) => {
  if (itemCount === 0) return null;

  return (
    <TouchableOpacity style={styles.cartSummary} onPress={onPress}>
      <View style={styles.cartBadge}>
        <Ionicons name="cart" size={24} color="#fff" />
        <View style={styles.cartCount}>
          <Text style={styles.cartCountText}>{itemCount}</Text>
        </View>
      </View>
      <View style={styles.cartInfo}>
        <Text style={styles.cartLabel}>Total del carrito</Text>
        <Text style={styles.cartTotal}>{total}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#fff" />
    </TouchableOpacity>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ShopViewModern: React.FC = () => {
  const { t } = useTranslation();
  const { shops, isLoading: shopsLoading } = useShops();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'blog'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Loading state
  if (shopsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // No shops
  if (shops.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="storefront-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No hay tiendas disponibles</Text>
        <Text style={styles.emptyText}>Las tiendas aparecerán aquí cuando estén configuradas</Text>
      </View>
    );
  }

  const selectedShop = shops.find(s => s.id === selectedShopId);
  if (!selectedShop) return null;

  return (
    <View style={styles.container}>
      {/* Store Header */}
      <StoreHeader shop={selectedShop} />

      {/* Approval Banner */}
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

      {/* Content */}
      {accessLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : !canView ? (
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#9ca3af" />
          <Text style={styles.accessDeniedTitle}>Acceso denegado</Text>
          <Text style={styles.accessDeniedText}>
            No tienes permisos para acceder a esta tienda
          </Text>
        </View>
      ) : activeTab === 'products' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Promo Banner */}
          <PromoBanner />

          {/* Categories */}
          <CategoryGrid
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Products */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Productos</Text>
            {productsLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
            ) : (
              <ProductsGrid
                products={products as Product[]}
                canOrder={canOrder}
                onAddToCart={handleAddToCart}
                isAdding={isAddingToCart}
              />
            )}
          </View>
        </ScrollView>
      ) : (
        <BlogSection
          posts={posts}
          isLoading={blogLoading}
          onRefresh={refetchBlog}
        />
      )}

      {/* Cart Summary */}
      {canOrder && activeTab === 'products' && (
        <CartSummary
          itemCount={itemCount}
          total={total}
          onPress={() => setShowCart(true)}
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
  // Store Header
  storeHeader: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  storeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  storeLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  storeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  // Promo Banner
  promoBanner: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoBannerContent: {
    flex: 1,
  },
  promoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  promoBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
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
  // Content
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  categoryCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  categoryDetail: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
  },
  categoryDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  categoryDetailDescription: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
  },
  brandsContainer: {
    marginTop: 12,
  },
  brandsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  brandsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandTag: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  brandTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  // Products
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
  },
  productImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
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
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
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
});

export default ShopViewModern;
