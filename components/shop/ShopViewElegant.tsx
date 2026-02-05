/**
 * Vista Elegante de Tienda
 * Diseño moderno, cálido y profesional para tienda de componentes de piano premium
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useShops, useShopProducts, useShopBlog, useShopBlogCategories } from '@/hooks/shop';
import { BlogSection } from './BlogSection';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

type TabType = 'products' | 'blog';

export function ShopViewElegant() {
  const { shops, isLoading: shopsLoading } = useShops();
  const shop = shops?.[0];
  
  console.log('[ShopViewElegant] DEBUG 1: shops=', shops, 'shop=', shop, 'shopsLoading=', shopsLoading);
  
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [selectedBlogCategory, setSelectedBlogCategory] = useState<number | undefined>();
  
  console.log('[ShopViewElegant] DEBUG 2: selectedBlogCategory=', selectedBlogCategory);
  
  const { products, isLoading: productsLoading, category: selectedCategory, setCategory: setSelectedCategory } = useShopProducts(shop?.id || null);
  
  console.log('[ShopViewElegant] DEBUG 3: Calling useShopBlog with shopId=', shop?.id, 'limit=10', 'categoryId=', selectedBlogCategory?.toString());
  
  const { posts, isLoading: blogLoading, refetch: refetchBlog } = useShopBlog(
    shop?.id || null, 
    10, 
    selectedBlogCategory?.toString()
  );
  
  console.log('[ShopViewElegant] DEBUG 4: posts=', posts, 'blogLoading=', blogLoading);
  
  console.log('[ShopViewElegant] DEBUG 5: Calling useShopBlogCategories with shopId=', shop?.id);
  
  const { categories: blogCategories, isLoading: categoriesLoading } = useShopBlogCategories(shop?.id || null);
  
  console.log('[ShopViewElegant] DEBUG 6: blogCategories=', blogCategories, 'categoriesLoading=', categoriesLoading);

  const categories = [
    { id: 'macillos', name: 'Macillos', description: 'Macillos de precisión para mecanismos de piano' },
    { id: 'cuerdas', name: 'Cuerdas', description: 'Cuerdas de acero y entorchadas de alta calidad' },
    { id: 'fieltros', name: 'Fieltros', description: 'Fieltros premium para apagadores y mecanismos' },
    { id: 'llaves', name: 'Llaves', description: 'Llaves de afinación profesionales' },
    { id: 'herramientas', name: 'Herramientas', description: 'Herramientas especializadas para técnicos' },
    { id: 'adhesivos', name: 'Adhesivos', description: 'Adhesivos y pegamentos especializados' },
    { id: 'mantenimiento', name: 'Mantenimiento', description: 'Productos de limpieza y mantenimiento' },
    { id: 'clavijas', name: 'Clavijas', description: 'Clavijas de afinación y repuestos' },
  ];

  if (shopsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando tienda...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay tiendas disponibles</Text>
      </View>
    );
  }

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'products' && styles.tabActive] as any}
        onPress={() => setActiveTab('products')}
      >
        <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive] as any}>
          Productos
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'blog' && styles.tabActive] as any}
        onPress={() => setActiveTab('blog')}
      >
        <Text style={[styles.tabText, activeTab === 'blog' && styles.tabTextActive] as any}>
          Blog
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Categorías</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategory === category.id && styles.categoryCardActive,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === category.id ? undefined : category.id
            )}
          >
            <Text style={[
              styles.categoryName,
              selectedCategory === category.id && styles.categoryNameActive,
            ]}>
              {category.name}
            </Text>
            <Text style={[
              styles.categoryDescription,
              selectedCategory === category.id && styles.categoryDescriptionActive,
            ]}>
              {category.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProducts = () => {
    if (productsLoading) {
      return (
        <View style={styles.loadingSection}>
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptySection}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
          </View>
          <Text style={styles.emptyTitle}>Próximamente</Text>
          <Text style={styles.emptyMessage}>
            Estamos preparando nuestro catálogo de productos premium.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Productos</Text>
        <View style={styles.productsGrid}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              {product.imageUrl && (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.description && (
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                )}
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>
                    €{product.Number(price).toFixed(2)}
                  </Text>
                  <TouchableOpacity style={styles.addToCartButton}>
                    <Text style={styles.addToCartText}>Añadir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderTabs()}
      
      {activeTab === 'products' ? (
        <>
          {renderCategories()}
          {renderProducts()}
        </>
      ) : (
        <>
          {/* Selector de categorías del blog */}
          {!categoriesLoading && blogCategories && blogCategories.length > 0 && (
            <View style={styles.blogCategoriesSection}>
              <Text style={styles.sectionTitle}>Categorías</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.blogCategoriesScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.blogCategoryChip,
                    !selectedBlogCategory && styles.blogCategoryChipActive,
                  ]}
                  onPress={() => setSelectedBlogCategory(undefined)}
                >
                  <Text
                    style={[
                      styles.blogCategoryChipText,
                      !selectedBlogCategory && styles.blogCategoryChipTextActive,
                    ]}
                  >
                    Todas
                  </Text>
                </TouchableOpacity>
                {blogCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.blogCategoryChip,
                      selectedBlogCategory === category.id && styles.blogCategoryChipActive,
                    ]}
                    onPress={() => setSelectedBlogCategory(
                      selectedBlogCategory === category.id ? undefined : category.id
                    )}
                  >
                    <Text
                      style={[
                        styles.blogCategoryChipText,
                        selectedBlogCategory === category.id && styles.blogCategoryChipTextActive,
                      ]}
                    >
                      {category.name} ({category.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <BlogSection posts={posts} isLoading={blogLoading} onRefresh={refetchBlog} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.xxl,
  },
  loadingSection: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.xxl,
  },
  emptySection: {
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: isDesktop ? 60 : Spacing.lg,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 400,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: isDesktop ? 60 : Spacing.lg,
    backgroundColor: Colors.light.surface,
  },
  tab: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.light.accent,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: Colors.light.accent,
    fontWeight: '600',
  },

  // Categories
  categoriesSection: {
    paddingHorizontal: isDesktop ? 60 : Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  categoryCard: {
    width: isDesktop ? 'calc(25% - 16px)' : 'calc(50% - 16px)',
    minWidth: isDesktop ? 240 : 150,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    margin: Spacing.sm,
    minHeight: 120,
    ...Shadows.sm,
  },
  categoryCardActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
    ...Shadows.md,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  categoryNameActive: {
    color: '#FFFFFF',
  },
  categoryDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  categoryDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Products
  productsSection: {
    paddingHorizontal: isDesktop ? 60 : Spacing.lg,
    paddingTop: Spacing.xl,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  productCard: {
    width: isDesktop ? 'calc(33.333% - 16px)' : 'calc(50% - 16px)',
    minWidth: isDesktop ? 280 : 150,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    margin: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.light.background,
  },
  productInfo: {
    padding: Spacing.lg,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  productDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.accent,
  },
  addToCartButton: {
    backgroundColor: Colors.light.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Blog Categories
  blogCategoriesSection: {
    paddingHorizontal: isDesktop ? 60 : Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  blogCategoriesScroll: {
    marginTop: Spacing.md,
  },
  blogCategoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  blogCategoryChipActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  blogCategoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  blogCategoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
