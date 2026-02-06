/**
 * Hook para gestión de categorías de inventario
 * Piano Emotion Manager
 */

import { trpc } from '@/utils/trpc';

export function useInventoryCategories() {
  const utils = trpc.useUtils();

  // Query para listar categorías
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = trpc.inventoryCategories.list.useQuery();

  // Mutation para crear categoría
  const createCategory = trpc.inventoryCategories.create.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
  });

  // Mutation para actualizar categoría
  const updateCategory = trpc.inventoryCategories.update.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
  });

  // Mutation para eliminar categoría
  const deleteCategory = trpc.inventoryCategories.delete.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
    },
  });

  // Mutation para reordenar categorías
  const reorderCategories = trpc.inventoryCategories.reorder.useMutation({
    onSuccess: () => {
      utils.inventoryCategories.list.invalidate();
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
