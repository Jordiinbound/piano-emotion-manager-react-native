/**
 * Hook de Citas basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook reemplaza la versión de AsyncStorage por una que usa tRPC
 * para sincronización con el servidor.
 */

import { useCallback, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import type { Appointment } from '@/types';

// Tipo de la cita del servidor
type ServerAppointment = {
  id: number;
  odId: string;
  clientId: number;
  pianoId: number | null;
  title: string;
  date: Date;
  duration: number | null;
  serviceType: string | null;
  status: string;
  notes: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Campos eager loaded
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  pianoBrand: string | null;
  pianoModel: string | null;
};

// Convertir cita del servidor al formato local
function serverToLocalAppointment(server: ServerAppointment): Appointment {
  // Convertir date a Date si es string
  const appointmentDate = server.date instanceof Date ? server.date : new Date(server.date);
  
  // Extraer fecha en formato YYYY-MM-DD (UTC)
  const dateOnly = appointmentDate.toISOString().split('T')[0];
  
  // Extraer hora de inicio en formato HH:MM (UTC)
  // Usar toISOString() en lugar de toTimeString() para evitar problemas de zona horaria
  const startTime = appointmentDate.toISOString().substring(11, 16); // "HH:MM"
  
  // Calcular hora de fin sumando la duración (UTC)
  const duration = server.duration || 60;
  const endDate = new Date(appointmentDate.getTime() + duration * 60000);
  const endTime = endDate.toISOString().substring(11, 16); // "HH:MM"
  
  return {
    id: String(server.id),
    clientId: String(server.clientId),
    pianoId: server.pianoId ? String(server.pianoId) : undefined,
    title: server.title,
    date: dateOnly,
    startTime: startTime,
    endTime: endTime,
    estimatedDuration: duration,
    serviceType: server.serviceType || undefined,
    status: server.status as Appointment['status'],
    notes: server.notes || undefined,
    address: server.address || undefined,
    createdAt: server.createdAt instanceof Date ? server.createdAt.toISOString() : (typeof server.createdAt === 'string' ? server.createdAt : new Date().toISOString()),
    updatedAt: server.updatedAt instanceof Date ? server.updatedAt.toISOString() : (typeof server.updatedAt === 'string' ? server.updatedAt : new Date().toISOString()),
    // Campos eager loaded
    clientName: server.clientName || undefined,
    clientEmail: server.clientEmail || undefined,
    clientPhone: server.clientPhone || undefined,
    pianoBrand: server.pianoBrand || undefined,
    pianoModel: server.pianoModel || undefined,
  };
}

export function useAppointmentsData() {
  const utils = trpc.useUtils();

  // Query para obtener todas las citas (límite alto para cargar todas)
  const { data: serverAppointments, isLoading: loading, refetch } = trpc.appointments.list.useQuery(
    { limit: 5000 },
    {
    staleTime: 2 * 60 * 1000, // 2 minutos (las citas cambian más frecuentemente)
  });

  // Query para estadísticas globales
  const { data: statsData } = trpc.appointments.getStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutations
  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
    },
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
    },
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
    },
  });

  // Convertir citas del servidor al formato local
  const appointments: Appointment[] = (serverAppointments?.items || []).map(serverToLocalAppointment);
  
  // Logs de diagnóstico
  console.log('🔍 [useAppointmentsData] Total citas del servidor:', serverAppointments?.items?.length || 0);
  console.log('🔍 [useAppointmentsData] Total citas convertidas:', appointments.length);
  console.log('🔍 [useAppointmentsData] Primeras 3 citas:', appointments.slice(0, 3).map(apt => ({
    id: apt.id,
    clientId: apt.clientId,
    date: apt.date,
    startTime: apt.startTime,
    status: apt.status
  })));
  console.log('🔍 [useAppointmentsData] Stats del servidor:', statsData);

  // Citas de hoy
  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.filter((a) => {
      const appointmentDate = new Date(a.date);
      return appointmentDate >= today && appointmentDate < tomorrow;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments]);

  // Próximas citas (próximos 7 días)
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return appointments.filter((a) => {
      const appointmentDate = new Date(a.date);
      return appointmentDate >= now && appointmentDate <= nextWeek && a.status !== 'cancelled';
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments]);

  // Añadir cita
  const addAppointment = useCallback(
    async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const result = await createMutation.mutateAsync({
        clientId: parseInt(appointment.clientId, 10),
        pianoId: appointment.pianoId ? parseInt(appointment.pianoId, 10) : null,
        title: appointment.title,
        date: appointment.date,
        duration: appointment.duration || 60,
        serviceType: appointment.serviceType || null,
        status: appointment.status || 'scheduled',
        notes: appointment.notes || null,
        address: appointment.address || null,
      });

      return serverToLocalAppointment(result as ServerAppointment);
    },
    [createMutation]
  );

  // Actualizar cita
  const updateAppointment = useCallback(
    async (id: string, updates: Partial<Appointment>) => {
      const updateData: Record<string, unknown> = {};

      if (updates.clientId !== undefined) updateData.clientId = parseInt(updates.clientId, 10);
      if (updates.pianoId !== undefined) updateData.pianoId = updates.pianoId ? parseInt(updates.pianoId, 10) : null;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.serviceType !== undefined) updateData.serviceType = updates.serviceType || null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.address !== undefined) updateData.address = updates.address || null;

      await updateMutation.mutateAsync({
        id: parseInt(id, 10),
        ...updateData,
      });
    },
    [updateMutation]
  );

  // Eliminar cita
  const deleteAppointment = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id: parseInt(id, 10) });
    },
    [deleteMutation]
  );

  // Obtener cita por ID
  const getAppointment = useCallback(
    (id: string) => appointments.find((a) => a.id === id),
    [appointments]
  );

  // Obtener citas por cliente
  const getAppointmentsByClient = useCallback(
    (clientId: string) => appointments.filter((a) => a.clientId === clientId),
    [appointments]
  );

  // Obtener citas por fecha
  const getAppointmentsByDate = useCallback(
    (date: Date) => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return appointments.filter((a) => {
        const appointmentDate = new Date(a.date);
        return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
      });
    },
    [appointments]
  );

  // Confirmar cita
  const confirmAppointment = useCallback(
    async (id: string) => {
      await updateAppointment(id, { status: 'confirmed' });
    },
    [updateAppointment]
  );

  // Cancelar cita
  const cancelAppointment = useCallback(
    async (id: string) => {
      await updateAppointment(id, { status: 'cancelled' });
    },
    [updateAppointment]
  );

  // Completar cita
  const completeAppointment = useCallback(
    async (id: string) => {
      await updateAppointment(id, { status: 'completed' });
    },
    [updateAppointment]
  );

  return {
    appointments,
    loading,
    todayAppointments,
    upcomingAppointments,
    stats: statsData,
    total: statsData?.total || appointments.length,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    getAppointmentsByClient,
    getAppointmentsByDate,
    confirmAppointment,
    cancelAppointment,
    completeAppointment,
    refresh: refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
