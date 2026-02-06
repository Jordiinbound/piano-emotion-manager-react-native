/**
 * Router de Categorías de Inventario
 * Piano Emotion Manager
 * 
 * Gestión completa de categorías configurables para inventario
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc.js';
import * as db from '../db.js';
import { inventoryCategories } from '../../drizzle/inventory-schema.js';
import { eq, and, asc } from 'drizzle-orm';

export const inventoryCategoriesRouter = router({
  /**
   * Listar todas las categorías activas
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];

    const categories = await database
      .select()
      .from(inventoryCategories)
      .where(
        and(
          eq(inventoryCategories.isActive, true),
          // Mostrar solo categorías del sistema (organizationId = null)
          eq(inventoryCategories.organizationId, null)
        )
      )
      .orderBy(asc(inventoryCategories.displayOrder));

    return categories;
  }),

  /**
   * Obtener una categoría por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) return null;

      const [category] = await database
        .select()
        .from(inventoryCategories)
        .where(
          and(
            eq(inventoryCategories.id, input.id),
            eq(inventoryCategories.organizationId, null)
          )
        )
        .limit(1);

      return category || null;
    }),

  /**
   * Crear nueva categoría personalizada
   */
  create: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        icon: z.string().min(1).max(50).default('doc.text.fill'),
        displayOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error('Database not available');

      // Calcular el siguiente displayOrder si no se proporciona
      let displayOrder = input.displayOrder;
      if (displayOrder === undefined) {
        const result = await database
          .select({ max: inventoryCategories.displayOrder })
          .from(inventoryCategories)
          .where(eq(inventoryCategories.organizationId, null));
        
        displayOrder = (result[0]?.max || 0) + 1;
      }

      const [newCategory] = await database
        .insert(inventoryCategories)
        .values({
          key: input.key,
          label: input.label,
          icon: input.icon,
          displayOrder,
          isActive: true,
          isSystem: false,
          organizationId: null,
        })
        .$returningId();

      return newCategory;
    }),

  /**
   * Actualizar categoría existente
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).max(100).optional(),
        icon: z.string().min(1).max(50).optional(),
        displayOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error('Database not available');

      const { id, ...updates } = input;

      // Verificar que la categoría existe
      const [existing] = await database
        .select()
        .from(inventoryCategories)
        .where(
          and(
            eq(inventoryCategories.id, id),
            eq(inventoryCategories.organizationId, null)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Categoría no encontrada');
      }

      // No permitir editar categorías del sistema (solo su orden)
      if (existing.isSystem && (updates.label || updates.icon)) {
        throw new Error('No se pueden editar categorías del sistema');
      }

      await database
        .update(inventoryCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(inventoryCategories.id, id));

      return { success: true };
    }),

  /**
   * Eliminar categoría personalizada
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error('Database not available');

      // Verificar que la categoría existe
      const [existing] = await database
        .select()
        .from(inventoryCategories)
        .where(
          and(
            eq(inventoryCategories.id, input.id),
            eq(inventoryCategories.organizationId, null)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Categoría no encontrada');
      }

      // No permitir eliminar categorías del sistema
      if (existing.isSystem) {
        throw new Error('No se pueden eliminar categorías del sistema');
      }

      // Soft delete: marcar como inactiva
      await database
        .update(inventoryCategories)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(inventoryCategories.id, input.id));

      return { success: true };
    }),

  /**
   * Reordenar categorías
   */
  reorder: protectedProcedure
    .input(
      z.object({
        categoryIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error('Database not available');

      // Actualizar el displayOrder de cada categoría según su posición en el array
      for (let i = 0; i < input.categoryIds.length; i++) {
        await database
          .update(inventoryCategories)
          .set({
            displayOrder: i + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryCategories.id, input.categoryIds[i]),
              eq(inventoryCategories.organizationId, null)
            )
          );
      }

      return { success: true };
    }),
});
