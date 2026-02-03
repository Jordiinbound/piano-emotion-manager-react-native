/**
 * Hook de Facturas basado en tRPC
 * Piano Emotion Manager
 * 
 * Este hook maneja la sincronización de facturas con el servidor,
 * incluyendo paginación infinita y filtrado en backend.
 */

import { useCallback, useMemo, useState } from 'react';
import { trpc } from '@/utils/trpc';

// Tipo de factura del servidor (debe coincidir con el schema de Drizzle)
type ServerInvoice = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string | null;
  date: Date;
  dueDate: Date | null;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  items: any;
  partnerId: number;
  createdAt: Date;
  updatedAt: Date;
};

// Tipo de factura local (debe coincidir con el tipo del frontend)
export type LocalInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  date: string;
  dueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
};

// Convertir factura del servidor al formato local
function serverToLocalInvoice(server: ServerInvoice): LocalInvoice {
  return {
    id: String(server.id),
    invoiceNumber: server.invoiceNumber,
    clientId: String(server.clientId),
    clientName: server.clientName || undefined,
    date: server.date instanceof Date 
      ? server.date.toISOString() 
      : String(server.date),
    dueDate: server.dueDate 
      ? (server.dueDate instanceof Date ? server.dueDate.toISOString() : String(server.dueDate))
      : undefined,
    status: server.status,
    subtotal: parseFloat(server.subtotal),
    tax: parseFloat(server.tax),
    total: parseFloat(server.total),
    notes: server.notes || undefined,
    items: Array.isArray(server.items) ? server.items : [],
    createdAt: server.createdAt instanceof Date 
      ? server.createdAt.toISOString() 
      : String(server.createdAt),
    updatedAt: server.updatedAt instanceof Date 
      ? server.updatedAt.toISOString() 
      : String(server.updatedAt),
  };
}

interface UseInvoicesDataOptions {
  search?: string;
  status?: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  clientId?: number;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
}

export function useInvoicesData(options: UseInvoicesDataOptions = {}) {
  const { search, status, clientId, dateFrom, dateTo, pageSize = 100 } = options;
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
  } = trpc.invoices.list.useInfiniteQuery(
    (() => {
      // Construir parámetros sin incluir valores undefined/null
      const params: any = { limit: pageSize };
      if (search) params.search = search;
      if (status) params.status = status;
      if (clientId) params.clientId = clientId;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      return params;
    })(),
    {
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
      onError: (err) => {
        console.error('Error al cargar facturas:', err);
        setError('Error al cargar las facturas');
      },
    }
  );

  // Query para estadísticas globales
  const { data: statsData } = trpc.invoices.getStats.useQuery(
    (() => {
      // Construir parámetros sin incluir valores undefined/null
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      return params;
    })(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Mutations con manejo de errores
  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al crear factura:', err);
      setError(err.message || 'Error al crear la factura');
      throw err;
    },
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al actualizar factura:', err);
      setError(err.message || 'Error al actualizar la factura');
      throw err;
    },
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setError(null);
    },
    onError: (err) => {
      console.error('Error al eliminar factura:', err);
      setError(err.message || 'Error al eliminar la factura');
      throw err;
    },
  });

  // Convertir facturas del servidor al formato local
  const invoices: LocalInvoice[] = useMemo(() => {
    if (!data?.pages) {
      console.log('🔍 [useInvoicesData] No hay páginas de datos');
      return [];
    }
    const allInvoices = data.pages.flatMap(page => 
      (page.items || []).map(serverToLocalInvoice)
    );
    console.log('🔍 [useInvoicesData] Total facturas cargadas:', allInvoices.length);
    console.log('🔍 [useInvoicesData] Primeras 3 facturas:', allInvoices.slice(0, 3).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      clientName: inv.clientName,
      total: inv.total
    })));
    return allInvoices;
  }, [data]);

  // Total de facturas - usar statsData si está disponible, sino el total de la primera página
  const totalInvoices = statsData?.total || data?.pages[0]?.total || 0;
  console.log('🔍 [useInvoicesData] Total facturas (statsData):', statsData?.total);
  console.log('🔍 [useInvoicesData] Total facturas (primera página):', data?.pages[0]?.total);

  // Estadísticas - usar statsData del endpoint dedicado
  const stats = statsData || data?.pages[0]?.stats || null;

  // Añadir factura
  const addInvoice = useCallback(
    async (invoice: Omit<LocalInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>): Promise<LocalInvoice> => {
      try {
        const result = await createMutation.mutateAsync({
          clientId: parseInt(invoice.clientId),
          date: new Date(invoice.date),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
          status: invoice.status,
          subtotal: invoice.subtotal.toString(),
          tax: invoice.tax.toString(),
          total: invoice.total.toString(),
          notes: invoice.notes || null,
          items: invoice.items,
        });

        return serverToLocalInvoice(result as ServerInvoice);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear factura';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [createMutation]
  );

  // Actualizar factura
  const updateInvoice = useCallback(
    async (id: string, updates: Partial<LocalInvoice>): Promise<void> => {
      const updateData: Record<string, unknown> = {
        id: parseInt(id),
      };

      if (updates.clientId !== undefined) updateData.clientId = parseInt(updates.clientId);
      if (updates.date !== undefined) updateData.date = new Date(updates.date);
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal.toString();
      if (updates.tax !== undefined) updateData.tax = updates.tax.toString();
      if (updates.total !== undefined) updateData.total = updates.total.toString();
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.items !== undefined) updateData.items = updates.items;

      try {
        await updateMutation.mutateAsync(updateData as any);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar factura';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [updateMutation]
  );

  // Eliminar factura
  const deleteInvoice = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync({ id: parseInt(id) });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al eliminar factura';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [deleteMutation]
  );

  // Obtener factura por ID
  const getInvoice = useCallback(
    (id: string) => {
      return invoices.find(inv => inv.id === id);
    },
    [invoices]
  );

  // Obtener facturas por cliente
  const getInvoicesByClient = useCallback(
    (clientId: string) => {
      return invoices.filter(inv => inv.clientId === clientId);
    },
    [invoices]
  );

  // Marcar como enviada
  const markAsSent = useCallback(
    async (id: string) => {
      await updateInvoice(id, { status: 'sent' });
    },
    [updateInvoice]
  );

  // Marcar como pagada
  const markAsPaid = useCallback(
    async (id: string) => {
      await updateInvoice(id, { status: 'paid' });
    },
    [updateInvoice]
  );

  return {
    invoices,
    loading,
    error,
    totalInvoices,
    stats,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice,
    getInvoicesByClient,
    markAsSent,
    markAsPaid,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  };
}
