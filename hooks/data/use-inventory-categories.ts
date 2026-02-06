/**
 * Hook para gestión de categorías de inventario
 * Piano Emotion Manager
 */

import { trpc } from '@/utils/trpc';

export function useInventoryCategories() {
  const utils = trpc.useUtils();

  // Query para listar categorías con manejo robusto de errores
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = trpc.inventoryCategories.list.useQuery(undefined, {
    // Retry solo 1 vez en caso de error
    retry: 1,
    // No hacer refetch automático
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Timeout de 10 segundos
    staleTime: 10000,
    // En caso de error, devolver array vacío
    onError: (err) => {
      console.error('[useInventoryCategories] Error loading categories:', err);
    },
  });

  // Mutation para crear categoría
  const createCategory = trpc.inventoryCategories.create.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
    onError: (err) => {
      console.error('[useInventoryCategories] Error creating category:', err);
    },
  });

  // Mutation para actualizar categoría
  const updateCategory = trpc.inventoryCategories.update.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
    onError: (err) => {
      console.error('[useInventoryCategories] Error updating category:', err);
    },
  });

  // Mutation para eliminar categoría
  const deleteCategory = trpc.inventoryCategories.delete.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
    onError: (err) => {
      console.error('[useInventoryCategories] Error deleting category:', err);
    },
  });

  // Mutation para reordenar categorías
  const reorderCategories = trpc.inventoryCategories.reorder.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
    onError: (err) => {
      console.error('[useInventoryCategories] Error reordering categories:', err);
    },
  });

  return {
    categories,
    isLoading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  };
}
