/**
 * Hook de Pianos basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook maneja la sincronización de pianos con el servidor,
 * incluyendo paginación infinita y filtrado en backend.
 */

import { useCallback, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import type { Piano } from '@/types';

// Tipo del piano del servidor
type ServerPiano = {
  id: number;
  odId: string;
  clientId: number;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  year: number | null;
  category: string;
  pianoType: string;
  condition: string | null;
  location: string | null;
  notes: string | null;
  photos: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

// Convertir piano del servidor al formato local
function serverToLocalPiano(server: ServerPiano): Piano {
  return {
    id: String(server.id),
    clientId: String(server.clientId),
    brand: server.brand,
    model: server.model || undefined,
    serialNumber: server.serialNumber || undefined,
    year: server.year || undefined,
    category: server.category as Piano['category'],
    pianoType: server.pianoType,
    condition: (server.condition as Piano['condition']) || 'good',
    location: server.location || undefined,
    notes: server.notes || undefined,
    photos: server.photos || [],
    createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : (typeof server.createdAt === 'string' ? server.createdAt : new Date().toISOString()),
    updatedAt: server.updatedAt instanceof Date ? server.updatedAt.toISOString() : (typeof server.updatedAt === 'string' ? server.updatedAt : new Date().toISOString()),
  };
}

interface UsePianosDataOptions {
  search?: string;
  brand?: string | null;
  category?: string | null;
  clientId?: string | null;
  pageSize?: number;
  enabled?: boolean;
}

export function usePianosData(options: UsePianosDataOptions = {}) {
  const { search, brand, category, clientId, pageSize = 30 } = options;
  const utils = trpc.useUtils();

  // Query con paginación infinita
  const { 
    data,
    isLoading: loading, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch 
  } = trpc.pianos.list.useInfiniteQuery(
    {
      limit: pageSize,
      search: search || undefined,
      brand: brand || undefined,
      category: category || undefined,
      clientId: clientId ? parseInt(clientId, 10) : undefined,
    },
    {
      enabled: options.enabled !== false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Query para marcas (agregación cacheada)
  const { data: brandsData } = trpc.pianos.getBrands.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  // Query para estadísticas
  const { data: statsData } = trpc.pianos.getStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutations
  const createMutation = trpc.pianos.create.useMutation({
    onSuccess: () => {
      utils.pianos.list.invalidate();
      utils.pianos.getBrands.invalidate();
    },
  });

  const updateMutation = trpc.pianos.update.useMutation({
    onSuccess: () => {
      utils.pianos.list.invalidate();
      utils.pianos.getBrands.invalidate();
    },
  });

  const deleteMutation = trpc.pianos.delete.useMutation({
    onSuccess: () => {
      utils.pianos.list.invalidate();
      utils.pianos.getBrands.invalidate();
    },
  });

  // Convertir pianos del servidor al formato local
  const pianos: Piano[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => 
      (page.items || []).map(serverToLocalPiano)
    );
  }, [data]);

  // Total de pianos
  const totalPianos = data?.pages[0]?.total || 0;

  // Marcas desde el backend
  const brands = brandsData || [];

  // Añadir piano
  const addPiano = useCallback(
    async (piano: Omit<Piano, 'id' | 'createdAt' | 'updatedAt'>) => {
      const result = await createMutation.mutateAsync({
        clientId: parseInt(piano.clientId, 10),
        brand: piano.brand,
        model: piano.model || null,
        serialNumber: piano.serialNumber || null,
        year: piano.year || null,
        category: piano.category,
        pianoType: piano.pianoType,
        condition: piano.condition,
        location: piano.location || null,
        notes: piano.notes || null,
        photos: piano.photos || [],
      });

      return serverToLocalPiano(result as ServerPiano);
    },
    [createMutation]
  );

  // Actualizar piano
  const updatePiano = useCallback(
    async (id: string, updates: Partial<Piano>) => {
      const updateData: Record<string, unknown> = {};

      if (updates.clientId !== undefined) updateData.clientId = parseInt(updates.clientId, 10);
      if (updates.brand !== undefined) updateData.brand = updates.brand;
      if (updates.model !== undefined) updateData.model = updates.model || null;
      if (updates.serialNumber !== undefined) updateData.serialNumber = updates.serialNumber || null;
      if (updates.year !== undefined) updateData.year = updates.year || null;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.pianoType !== undefined) updateData.pianoType = updates.pianoType;
      if (updates.condition !== undefined) updateData.condition = updates.condition;
      if (updates.location !== undefined) updateData.location = updates.location || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.photos !== undefined) updateData.photos = updates.photos;

      await updateMutation.mutateAsync({
        id: parseInt(id, 10),
        ...updateData,
      });
    },
    [updateMutation]
  );

  // Eliminar piano
  const deletePiano = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id: parseInt(id, 10) });
    },
    [deleteMutation]
  );

  // Obtener piano por ID
  const getPiano = useCallback(
    (id: string | number) => {
      const normalizedId = String(id);
      return pianos.find((p) => p.id === normalizedId);
    },
    [pianos]
  );

  // Obtener pianos por cliente
  const getPianosByClient = useCallback(
    (clientId: string | number) => {
      const normalizedId = String(clientId);
      return pianos.filter((p) => p.clientId === normalizedId);
    },
    [pianos]
  );

  // Cargar más pianos
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    pianos,
    totalPianos,
    loading,
    addPiano,
    updatePiano,
    deletePiano,
    getPiano,
    getPianosByClient,
    refresh: refetch,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    brands,
    stats: statsData || { total: 0, vertical: 0, grand: 0 },
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
