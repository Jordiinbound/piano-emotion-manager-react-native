/**
 * Hook de Clientes basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook maneja la sincronización de clientes con el servidor,
 * incluyendo paginación infinita y filtrado en backend.
 */

import { useCallback, useMemo, useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { Client } from '@/types';

// Tipo del cliente del servidor
type ServerClient = {
  id: number;
  odId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clientType: string;
  notes: string | null;
  taxId?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  routeGroup?: string | null;
  pianoCount?: number; // Número de pianos del cliente
  createdAt: Date;
  updatedAt: Date;
};

// Convertir cliente del servidor al formato local
function serverToLocalClient(server: ServerClient): Client {
  // Parsear el nombre en firstName, lastName1, lastName2
  const nameParts = server.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName1 = nameParts[1] || undefined;
  const lastName2 = nameParts.slice(2).join(' ') || undefined;

  return {
    id: String(server.id),
    firstName,
    lastName1,
    lastName2,
    type: (server.clientType as Client['type']) || 'individual',
    phone: server.phone || '',
    email: server.email || undefined,
    taxId: server.taxId || undefined,
    addressText: server.address || undefined,
    address: server.address ? {
      street: server.address,
      city: server.city || undefined,
      province: server.region || undefined,
      postalCode: server.postalCode || undefined,
    } : undefined,
    city: server.city || undefined,
    region: server.region || undefined,
    routeGroup: server.routeGroup || undefined,
    notes: server.notes || undefined,
    pianoCount: server.pianoCount || 0, // Agregar pianoCount
    createdAt: server.createdAt instanceof Date 
      ? server.createdAt.toISOString() 
      : String(server.createdAt),
    updatedAt: server.updatedAt instanceof Date 
      ? server.updatedAt.toISOString() 
      : String(server.updatedAt),
  } as any; // Cast temporal para incluir pianoCount
}

interface UseClientsDataOptions {
  search?: string;
  region?: string | null;
  routeGroup?: string | null;
  pageSize?: number;
  enabled?: boolean;
}

export function useClientsData(options: UseClientsDataOptions = {}) {
  const { search, region, routeGroup, pageSize = 30 } = options;
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);

  // Query con paginación infinita
  const { 
    data,
    isLoading: loading, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    error: queryError 
  } = trpc.clients.list.useInfiniteQuery(
    {
      limit: pageSize,
      search: search || undefined,
      region: region || undefined,
      routeGroup: routeGroup || undefined,
    },
    {
      enabled: options.enabled !== false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
      onError: (err) => {
        console.error('Error al cargar clientes:', err);
        setError('Error al cargar los clientes');
      },
    }
  );

  // Queries para agregaciones (regiones y rutas)
  const { data: regionsData } = trpc.clients.getRegions.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  const { data: routeGroupsData } = trpc.clients.getRouteGroups.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  // Query para estadísticas globales
  const { data: statsData } = trpc.clients.getStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  console.log('[useClientsData] statsData:', statsData);
  
  // Valores por defecto si statsData no está disponible
  const statsDefault = { total: 0, active: 0, vip: 0, withPianos: 0 };

  // Mutations con manejo de errores
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.getRegions.invalidate();
      utils.clients.getRouteGroups.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al crear cliente:', err);
      setError(err.message || 'Error al crear el cliente');
      throw err;
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.getRegions.invalidate();
      utils.clients.getRouteGroups.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al actualizar cliente:', err);
      setError(err.message || 'Error al actualizar el cliente');
      throw err;
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      utils.clients.getRegions.invalidate();
      utils.clients.getRouteGroups.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al eliminar cliente:', err);
      setError(err.message || 'Error al eliminar el cliente');
      throw err;
    },
  });

  // Convertir clientes del servidor al formato local
  const clients: Client[] = useMemo(() => {
    console.log('[useClientsData] data:', data);
    console.log('[useClientsData] data?.pages:', data?.pages);
    if (!data?.pages) {
      console.log('[useClientsData] No pages, returning empty array');
      return [];
    }
    const result = data.pages.flatMap(page => {
      console.log('[useClientsData] page:', page);
      console.log('[useClientsData] page.items length:', page.items?.length);
      return (page.items || []).map(serverToLocalClient);
    });
    console.log('[useClientsData] Total clients after conversion:', result.length);
    return result;
  }, [data]);

  // Total de clientes
  const totalClients = data?.pages[0]?.total || 0;

  // Regiones y rutas desde el backend
  const regions = regionsData || [];
  const routeGroups = routeGroupsData || [];

  // Añadir cliente con manejo de errores mejorado
  const addClient = useCallback(
    async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
      const fullName = [client.firstName, client.lastName1, client.lastName2]
        .filter(Boolean)
        .join(' ');

      // Validación del lado del cliente
      if (!fullName.trim()) {
        throw new Error('El nombre es obligatorio');
      }
      if (!client.phone?.trim()) {
        throw new Error('El teléfono es obligatorio');
      }

      // Mapear tipo de cliente del frontend al backend
      const clientTypeMap: Record<string, string> = {
        'individual': 'particular',
        'particular': 'particular',
        'student': 'student',
        'professional': 'professional',
        'music_school': 'music_school',
        'conservatory': 'conservatory',
        'concert_hall': 'concert_hall',
        'school': 'music_school',
        'company': 'professional',
      };
      const mappedClientType = clientTypeMap[client.type || 'individual'] || 'particular';

      try {
        const result = await createMutation.mutateAsync({
          name: fullName,
          email: client.email || null,
          phone: client.phone || null,
          address: client.addressText || (client.address?.street ? 
            [
              client.address.street,
              client.address.number,
              client.address.floor,
              client.address.postalCode,
              client.address.city,
              client.address.province
            ].filter(Boolean).join(', ') : null),
          clientType: mappedClientType as "particular" | "student" | "professional" | "music_school" | "conservatory" | "concert_hall",
          notes: client.notes || null,
          taxId: client.taxId || null,
          city: client.address?.city || null,
          postalCode: client.address?.postalCode || null,
          region: client.address?.province || null,
          routeGroup: client.routeGroup || null,
        });

        return serverToLocalClient(result as ServerClient);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear cliente';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [createMutation]
  );

  // Actualizar cliente
  const updateClient = useCallback(
    async (id: string, updates: Partial<Client>): Promise<void> => {
      const updateData: Record<string, unknown> = {};

      if (updates.firstName !== undefined || updates.lastName1 !== undefined || updates.lastName2 !== undefined) {
        const existingClient = clients.find(c => c.id === id);
        const firstName = updates.firstName ?? existingClient?.firstName ?? '';
        const lastName1 = updates.lastName1 ?? existingClient?.lastName1 ?? '';
        const lastName2 = updates.lastName2 ?? existingClient?.lastName2 ?? '';
        updateData.name = [firstName, lastName1, lastName2].filter(Boolean).join(' ');
      }

      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.addressText !== undefined) updateData.address = updates.addressText || null;
      if (updates.type !== undefined) updateData.clientType = updates.type;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.taxId !== undefined) updateData.taxId = updates.taxId || null;
      if (updates.routeGroup !== undefined) updateData.routeGroup = updates.routeGroup || null;

      // Dirección estructurada
      if (updates.address) {
        updateData.addressStructured = {
          street: updates.address.street || null,
          number: updates.address.number || null,
          floor: updates.address.floor || null,
          postalCode: updates.address.postalCode || null,
          city: updates.address.city || null,
          province: updates.address.province || null,
        };
        updateData.city = updates.address.city || null;
        updateData.postalCode = updates.address.postalCode || null;
        updateData.region = updates.address.province || null;
      }

      try {
        await updateMutation.mutateAsync({
          id: parseInt(id, 10),
          ...updateData,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar cliente';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [updateMutation, clients]
  );

  // Eliminar cliente
  const deleteClient = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync({ id: parseInt(id, 10) });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al eliminar cliente';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [deleteMutation]
  );

  // Obtener cliente por ID
  const getClientQuery = trpc.clients.getById.useQuery;

  const getClient = useCallback(
    (id: string | number) => {
      // Normalizar el ID a string para la comparación
      const normalizedId = String(id);
      const client = clients.find((c) => c.id === normalizedId);
      if (client) return client;

      // Si no está en la lista, intentar obtenerlo del backend
      // Esto es útil para componentes que necesitan un cliente específico
      // que aún no se ha cargado en la lista paginada.
      // const { data } = getClientQuery({ id: parseInt(normalizedId, 10) });
      // return data ? serverToLocalClient(data as ServerClient) : undefined;
      return undefined; // Por ahora, para evitar llamadas extra
    },
    [clients]
  );

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cargar más clientes
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    clients,
    totalClients,
    loading,
    error: error || (queryError?.message ?? null),
    addClient,
    updateClient,
    deleteClient,
    getClient,
    refresh: refetch,
    clearError,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    regions,
    routeGroups,
    stats: statsData || statsDefault,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error?.message ?? null,
    updateError: updateMutation.error?.message ?? null,
    deleteError: deleteMutation.error?.message ?? null,
  };
}
