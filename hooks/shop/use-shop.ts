/**
 * Hooks de Tienda
 * Piano Emotion Manager
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';

// ============================================================================
// Types
// ============================================================================

export type ShopType = 'distributor' | 'external';
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// ============================================================================
// useShops Hook
// ============================================================================

export function useShops() {
  const { data: shops, isLoading, refetch } = trpc.shop.getShops.useQuery();

  const createShop = trpc.shop.createShop.useMutation({
    onSuccess: () => refetch(),
  });

  return {
    shops: shops || [],
    isLoading,
    refetch,
    createShop: createShop.mutateAsync,
    isCreating: createShop.isPending,
  };
}

// ============================================================================
// useShopAccess Hook
// ============================================================================

export function useShopAccess(shopId: number | null) {
  const { data: access, isLoading } = trpc.shop.checkAccess.useQuery(
    { shopId: shopId! },
    { enabled: shopId !== null }
  );

  return {
    access,
    canView: access?.canView ?? false,
    canOrder: access?.canOrder ?? false,
    canApprove: access?.canApprove ?? false,
    maxOrderAmount: access?.maxOrderAmount,
    requiresApproval: access?.requiresApproval ?? true,
    isLoading,
  };
}

// ============================================================================
// useShopProducts Hook
// ============================================================================

export function useShopProducts(shopId: number | null) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState<string | undefined>();

  const { data, isLoading, refetch } = trpc.shop.getProducts.useQuery(
    { shopId: shopId!, category, search, page, pageSize: 20 },
    { enabled: shopId !== null }
  );

  return {
    products: data?.products || [],
    total: data?.total || 0,
    isLoading,
    refetch,
    page,
    setPage,
    category,
    setCategory,
    search,
    setSearch,
    totalPages: Math.ceil((data?.total || 0) / 20),
  };
}

// ============================================================================
// useCart Hook
// ============================================================================

export function useCart(shopId: number | null) {
  const { data, isLoading, refetch } = trpc.shop.getCart.useQuery(
    { shopId: shopId! },
    { enabled: shopId !== null }
  );

  const addToCart = trpc.shop.addToCart.useMutation({
    onSuccess: () => refetch(),
  });

  const createOrder = trpc.shop.createOrder.useMutation({
    onSuccess: () => refetch(),
  });

  const { data: canPlaceOrderData } = trpc.shop.canPlaceOrder.useQuery(
    { shopId: shopId!, total: data?.total || 0 },
    { enabled: shopId !== null && (data?.total || 0) > 0 }
  );

  return {
    cart: data?.cart,
    items: data?.items || [],
    total: data?.total || 0,
    itemCount: data?.items?.length || 0,
    isLoading,
    refetch,
    addToCart: (productId: number, quantity?: number) =>
      addToCart.mutateAsync({ shopId: shopId!, productId, quantity }),
    isAddingToCart: addToCart.isPending,
    createOrder: (shippingAddress: ShippingAddress, notes?: string) =>
      createOrder.mutateAsync({ shopId: shopId!, shippingAddress, notes }),
    isCreatingOrder: createOrder.isPending,
    canPlaceOrder: canPlaceOrderData?.allowed ?? false,
    orderRequiresApproval: canPlaceOrderData?.requiresApproval ?? false,
  };
}

// ============================================================================
// useOrders Hook
// ============================================================================

export function useOrders(options: { status?: OrderStatus; shopId?: number } = {}) {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.shop.getOrders.useQuery({
    status: options.status,
    shopId: options.shopId,
    page,
    pageSize: 20,
  });

  return {
    orders: data?.orders || [],
    total: data?.total || 0,
    isLoading,
    refetch,
    page,
    setPage,
    totalPages: Math.ceil((data?.total || 0) / 20),
  };
}

// ============================================================================
// usePendingApprovals Hook
// ============================================================================

export function usePendingApprovals() {
  const { data, isLoading, refetch } = trpc.shop.getPendingApprovals.useQuery();

  const approveOrder = trpc.shop.approveOrder.useMutation({
    onSuccess: () => refetch(),
  });

  const rejectOrder = trpc.shop.rejectOrder.useMutation({
    onSuccess: () => refetch(),
  });

  return {
    pendingOrders: data || [],
    count: data?.length || 0,
    isLoading,
    refetch,
    approveOrder: (orderId: number) => approveOrder.mutateAsync({ orderId }),
    rejectOrder: (orderId: number, reason: string) => rejectOrder.mutateAsync({ orderId, reason }),
    isApproving: approveOrder.isPending,
    isRejecting: rejectOrder.isPending,
  };
}

// ============================================================================
// useShopPermissions Hook (Admin)
// ============================================================================

export function useShopPermissions(shopId: number | null) {
  const updatePermissions = trpc.shop.updatePermissions.useMutation();

  return {
    updatePermissions: (permissions: Array<{
      role: string;
      canView: boolean;
      canOrder: boolean;
      canApprove: boolean;
      maxOrderAmount?: number;
    }>) => updatePermissions.mutateAsync({ shopId: shopId!, permissions }),
    isUpdating: updatePermissions.isPending,
  };
}

// ============================================================================
// useShopBlog Hook
// ============================================================================

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  url: string;
  date: string;
  imageUrl?: string;
  categories: string[];
}

export function useShopBlog(shopId: number | null, limit: number = 5, categoryId?: string) {
  const { data: posts, isLoading, refetch } = trpc.shop.getBlogPosts.useQuery(
    { limit, categoryId },
    { enabled: shopId !== null }
  );

  return {
    posts: (posts || []) as BlogPost[],
    isLoading,
    refetch,
  };
}

// ============================================================================
// useShopBlogCategories Hook
// ============================================================================

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export function useShopBlogCategories(shopId: number | null) {
  const { data: categories, isLoading } = trpc.shop.getBlogCategories.useQuery(
    undefined,
    { enabled: shopId !== null }
  );

  return {
    categories: (categories || []) as BlogCategory[],
    isLoading,
  };
}

// ============================================================================
// useShopBlogSearch Hook
// ============================================================================

export function useShopBlogSearch(shopId: number | null) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useCallback(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: posts, isLoading } = trpc.shop.searchBlogPosts.useQuery(
    { shopId: shopId!, query: debouncedQuery },
    { enabled: shopId !== null && debouncedQuery.length > 0 }
  );

  return {
    posts: (posts || []) as BlogPost[],
    isLoading,
    query,
    setQuery,
  };
}
