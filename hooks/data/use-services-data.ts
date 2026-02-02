/**
 * Hook de Servicios basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook reemplaza la versión de AsyncStorage por una que usa tRPC
 * para sincronización con el servidor.
 */

import { useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { Service } from '@/types';

// Tipo del servicio del servidor
type ServerService = {
  id: number;
  odId: string;
  pianoId: number;
  clientId: number;
  serviceType: string;
  date: Date;
  cost: string | null;
  duration: number | null;
  tasks: unknown[] | null;
  notes: string | null;
  technicianNotes: string | null;
  materialsUsed: unknown[] | null;
  photosBefore: string[] | null;
  photosAfter: string[] | null;
  clientSignature: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Convertir servicio del servidor al formato local
function serverToLocalService(server: ServerService): Service {
  // Normalizar serviceType: convertir maintenance_* a 'maintenance'
  let normalizedType = server.serviceType;
  if (normalizedType.startsWith('maintenance_')) {
    normalizedType = 'maintenance';
  }
  
  return {
    id: String(server.id),
    pianoId: String(server.pianoId),
    clientId: String(server.clientId),
    serviceType: server.serviceType as Service['serviceType'],
    type: normalizedType as Service['type'], // Agregar alias 'type' para compatibilidad
    date: server.date instanceof Date ? server.date.toISOString() : (typeof server.date === 'string' ? server.date : new Date().toISOString()),
    cost: server.cost ? parseFloat(server.cost) : undefined,
    duration: server.duration || undefined,
    tasks: (server.tasks as Service['tasks']) || [],
    notes: server.notes || undefined,
    technicianNotes: server.technicianNotes || undefined,
    materialsUsed: (server.materialsUsed as Service['materialsUsed']) || [],
    photosBefore: server.photosBefore || [],
    photosAfter: server.photosAfter || [],
    clientSignature: server.clientSignature || undefined,
    createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : (typeof server.createdAt === 'string' ? server.createdAt : new Date().toISOString()),
    updatedAt: server.updatedAt instanceof Date ? server.updatedAt.toISOString() : (typeof server.updatedAt === 'string' ? server.updatedAt : new Date().toISOString()),
  };
}

interface UseServicesDataOptions {
  pageSize?: number;
}

export function useServicesData(options: UseServicesDataOptions = {}) {
  const { pageSize } = options;
  const utils = trpc.useUtils();

  // Query para obtener todos los servicios
  const { data: serverServices, isLoading: loading, refetch } = trpc.services.list.useQuery(
    pageSize ? { limit: pageSize } : undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Query para obtener estadísticas
  const { data: statsData } = trpc.services.getStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutations
  const createMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      utils.services.list.invalidate();
    },
  });

  const updateMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      utils.services.list.invalidate();
    },
  });

  const deleteMutation = trpc.services.delete.useMutation({
    onSuccess: () => {
      utils.services.list.invalidate();
    },
  });

  // Convertir servicios del servidor al formato local
  const services: Service[] = (serverServices?.items || []).map(serverToLocalService);

  // Añadir servicio
  const addService = useCallback(
    async (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
      const result = await createMutation.mutateAsync({
        pianoId: parseInt(service.pianoId, 10),
        clientId: parseInt(service.clientId, 10),
        serviceType: service.serviceType,
        date: service.date,
        cost: service.cost || null,
        duration: service.duration || null,
        tasks: service.tasks || [],
        notes: service.notes || null,
        technicianNotes: service.technicianNotes || null,
        materialsUsed: service.materialsUsed?.map(m => ({
          materialId: parseInt(m.materialId, 10),
          quantity: m.quantity,
        })) || [],
        photosBefore: service.photosBefore || [],
        photosAfter: service.photosAfter || [],
        clientSignature: service.clientSignature || null,
      });

      return serverToLocalService(result as ServerService);
    },
    [createMutation]
  );

  // Actualizar servicio
  const updateService = useCallback(
    async (id: string, updates: Partial<Service>) => {
      const updateData: Record<string, unknown> = {};

      if (updates.pianoId !== undefined) updateData.pianoId = parseInt(updates.pianoId, 10);
      if (updates.clientId !== undefined) updateData.clientId = parseInt(updates.clientId, 10);
      if (updates.serviceType !== undefined) updateData.serviceType = updates.serviceType;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.cost !== undefined) updateData.cost = updates.cost || null;
      if (updates.duration !== undefined) updateData.duration = updates.duration || null;
      if (updates.tasks !== undefined) updateData.tasks = updates.tasks;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.technicianNotes !== undefined) updateData.technicianNotes = updates.technicianNotes || null;
      if (updates.materialsUsed !== undefined) {
        updateData.materialsUsed = updates.materialsUsed?.map(m => ({
          materialId: parseInt(m.materialId, 10),
          quantity: m.quantity,
        }));
      }
      if (updates.photosBefore !== undefined) updateData.photosBefore = updates.photosBefore;
      if (updates.photosAfter !== undefined) updateData.photosAfter = updates.photosAfter;
      if (updates.clientSignature !== undefined) updateData.clientSignature = updates.clientSignature || null;

      await updateMutation.mutateAsync({
        id: parseInt(id, 10),
        ...updateData,
      });
    },
    [updateMutation]
  );

  // Eliminar servicio
  const deleteService = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id: parseInt(id, 10) });
    },
    [deleteMutation]
  );

  // Obtener servicio por ID
  const getService = useCallback(
    (id: string) => services.find((s) => s.id === id),
    [services]
  );

  // Obtener servicios por piano
  const getServicesByPiano = useCallback(
    (pianoId: string) => services.filter((s) => s.pianoId === pianoId),
    [services]
  );

  // Obtener servicios por cliente
  const getServicesByClient = useCallback(
    (clientId: string) => services.filter((s) => s.clientId === clientId),
    [services]
  );

  return {
    services,
    loading,
    stats: statsData,
    addService,
    updateService,
    deleteService,
    getService,
    getServicesByPiano,
    getServicesByClient,
    refresh: refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
