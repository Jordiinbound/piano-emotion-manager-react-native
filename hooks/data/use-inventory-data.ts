/**
 * Hook de Inventario basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook reemplaza la versión de AsyncStorage por una que usa tRPC
 * para sincronización con el servidor.
 */

import { useCallback, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import type { Material } from '@/types/inventory';

// Tipo del item de inventario del servidor
type ServerInventoryItem = {
  id: number;
  odId: string;
  name: string;
  category: string;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  minStock: string | null;
  costPerUnit: string | null;
  supplier: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Convertir item del servidor al formato local
function serverToLocalMaterial(server: ServerInventoryItem): Material {
  return {
    id: String(server.id),
    name: server.name,
    category: server.category as Material['category'],
    description: server.description || undefined,
    quantity: server.quantity ? parseFloat(server.quantity) : 0,
    unit: server.unit || 'unidades',
    minStock: server.minStock ? parseFloat(server.minStock) : undefined,
    costPerUnit: server.costPerUnit ? parseFloat(server.costPerUnit) : undefined,
    supplier: server.supplier || undefined,
    createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : (typeof server.createdAt === 'string' ? server.createdAt : new Date().toISOString()),
    updatedAt: server.updatedAt instanceof Date ? server.updatedAt.toISOString() : (typeof server.updatedAt === 'string' ? server.updatedAt : new Date().toISOString()),
  };
}

export function useInventoryData() {
  const utils = trpc.useUtils();

  // Query para obtener todo el inventario
  const { data: serverInventory, isLoading: loading, refetch } = trpc.inventory.list.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Mutations
  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
    },
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
    },
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
    },
  });

  // Convertir inventario del servidor al formato local
  const materials: Material[] = (serverInventory?.items || []).map(serverToLocalMaterial);

  // Calcular items con stock bajo
  const lowStockItems = useMemo(() => {
    return materials.filter((m) => {
      if (m.minStock === undefined) return false;
      return m.quantity <= m.minStock;
    });
  }, [materials]);

  // Añadir material
  const addMaterial = useCallback(
    async (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
      const result = await createMutation.mutateAsync({
        name: material.name,
        category: material.category,
        description: material.description || null,
        quantity: String(material.quantity || 0),
        unit: material.unit || 'unidades',
        minStock: material.minStock !== undefined ? String(material.minStock) : undefined,
        costPerUnit: material.costPerUnit !== undefined ? String(material.costPerUnit) : null,
        supplier: material.supplier || null,
      });

      return serverToLocalMaterial(result as ServerInventoryItem);
    },
    [createMutation]
  );

  // Actualizar material
  const updateMaterial = useCallback(
    async (id: string, updates: Partial<Material>) => {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.quantity !== undefined) updateData.quantity = String(updates.quantity);
      if (updates.unit !== undefined) updateData.unit = updates.unit;
      if (updates.minStock !== undefined) updateData.minStock = String(updates.minStock);
      if (updates.costPerUnit !== undefined) updateData.costPerUnit = updates.costPerUnit !== undefined ? String(updates.costPerUnit) : null;
      if (updates.supplier !== undefined) updateData.supplier = updates.supplier || null;

      await updateMutation.mutateAsync({
        id: parseInt(id, 10),
        ...updateData,
      });
    },
    [updateMutation]
  );

  // Eliminar material
  const deleteMaterial = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id: parseInt(id, 10) });
    },
    [deleteMutation]
  );

  // Obtener material por ID
  const getMaterial = useCallback(
    (id: string) => materials.find((m) => m.id === id),
    [materials]
  );

  // Actualizar cantidad (incrementar/decrementar)
  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      const material = materials.find((m) => m.id === id);
      if (!material) return;

      const newQuantity = Math.max(0, material.quantity + delta);
      await updateMaterial(id, { quantity: newQuantity });
    },
    [materials, updateMaterial]
  );

  // Obtener materiales por categoría
  const getMaterialsByCategory = useCallback(
    (category: Material['category']) => materials.filter((m) => m.category === category),
    [materials]
  );

  return {
    materials,
    loading,
    lowStockItems,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterial,
    updateQuantity,
    getMaterialsByCategory,
    refresh: refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
