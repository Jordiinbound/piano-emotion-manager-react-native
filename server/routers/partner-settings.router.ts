import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { database } from "../db.js";
import { partnerSettings, clients, pianos } from "../../drizzle/schema.js";
import { eq, and, sql, isNotNull, gt } from "drizzle-orm";

export const partnerSettingsRouter = router({
  // Obtener configuración VIP actual
  getVipConfig: protectedProcedure.query(async ({ ctx }) => {
    const [settings] = await database
      .select({
        vipThreshold: partnerSettings.vipThreshold,
      })
      .from(partnerSettings)
      .where(eq(partnerSettings.partnerId, ctx.partnerId))
      .limit(1);

    // Si no existe configuración, crear una con valores por defecto
    if (!settings) {
      await database.insert(partnerSettings).values({
        partnerId: ctx.partnerId,
        vipThreshold: "30000.00",
      });
      return { vipThreshold: "30000.00" };
    }

    return { vipThreshold: settings.vipThreshold || "30000.00" };
  }),

  // Actualizar umbral VIP y recalcular VIPs automáticos
  updateVipThreshold: protectedProcedure
    .input(
      z.object({
        threshold: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { threshold } = input;

      // Actualizar o crear configuración
      const [existing] = await database
        .select()
        .from(partnerSettings)
        .where(eq(partnerSettings.partnerId, ctx.partnerId))
        .limit(1);

      if (existing) {
        await database
          .update(partnerSettings)
          .set({ vipThreshold: threshold.toString() })
          .where(eq(partnerSettings.partnerId, ctx.partnerId));
      } else {
        await database.insert(partnerSettings).values({
          partnerId: ctx.partnerId,
          vipThreshold: threshold.toString(),
        });
      }

      // Recalcular VIPs automáticos
      await recalculateAutoVips(ctx.partnerId, threshold);

      return { success: true, threshold };
    }),

  // Marcar/desmarcar cliente como VIP manualmente
  toggleManualVip: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        isVip: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { clientId, isVip } = input;

      await database
        .update(clients)
        .set({
          isVip: isVip ? 1 : 0,
          vipSource: isVip ? "manual" : null,
        })
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.partnerId, ctx.partnerId)
          )
        );

      return { success: true, clientId, isVip };
    }),

  // Recalcular todos los VIPs automáticos
  recalculateVips: protectedProcedure.mutation(async ({ ctx }) => {
    // Obtener umbral actual
    const [settings] = await database
      .select({ vipThreshold: partnerSettings.vipThreshold })
      .from(partnerSettings)
      .where(eq(partnerSettings.partnerId, ctx.partnerId))
      .limit(1);

    const threshold = settings?.vipThreshold
      ? parseFloat(settings.vipThreshold)
      : 30000;

    await recalculateAutoVips(ctx.partnerId, threshold);

    return { success: true, threshold };
  }),
});

// Función auxiliar para recalcular VIPs automáticos
async function recalculateAutoVips(partnerId: number, threshold: number) {
  // 1. Desmarcar todos los VIPs automáticos
  await database
    .update(clients)
    .set({ isVip: 0, vipSource: null })
    .where(
      and(
        eq(clients.partnerId, partnerId),
        eq(clients.vipSource, "auto")
      )
    );

  // 2. Obtener clientes con pianos que superan el umbral
  const clientsAboveThreshold = await database
    .select({
      clientId: pianos.clientId,
      maxValue: sql<number>`GREATEST(
        COALESCE(MAX(${pianos.purchasePrice}), 0),
        COALESCE(MAX(${pianos.currentValue}), 0),
        COALESCE(MAX(${pianos.insuranceValue}), 0)
      )`,
    })
    .from(pianos)
    .where(
      and(
        eq(pianos.partnerId, partnerId),
        isNotNull(pianos.clientId)
      )
    )
    .groupBy(pianos.clientId)
    .having(sql`GREATEST(
      COALESCE(MAX(${pianos.purchasePrice}), 0),
      COALESCE(MAX(${pianos.currentValue}), 0),
      COALESCE(MAX(${pianos.insuranceValue}), 0)
    ) >= ${threshold}`);

  // 3. Marcar como VIP automático solo si no son VIP manuales
  if (clientsAboveThreshold.length > 0) {
    const clientIds = clientsAboveThreshold
      .map((c) => c.clientId)
      .filter((id): id is number => id !== null);

    if (clientIds.length > 0) {
      // Solo actualizar clientes que NO son VIP manuales
      await database
        .update(clients)
        .set({ isVip: 1, vipSource: "auto" })
        .where(
          and(
            sql`${clients.id} IN (${sql.join(clientIds.map((id) => sql`${id}`), sql`, `)})`,
            eq(clients.partnerId, partnerId),
            sql`(${clients.vipSource} IS NULL OR ${clients.vipSource} != 'manual')`
          )
        );
    }
  }
}
