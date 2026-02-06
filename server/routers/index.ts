/**
 * Exportación de Routers
 * Piano Emotion Manager
 */

// Routers de entidades principales
export { clientsRouter } from './clients.router.js';
export { pianosRouter } from './pianos.router.js';
export { servicesRouter } from './services.router.js';
export { inventoryRouter } from './inventory.router.js';
// export { inventoryCategoriesRouter } from './inventory-categories.router.js'; // Temporalmente deshabilitado
export { appointmentsRouter } from './appointments.router.js';
export { invoicesRouter } from './invoices.router.js';
export { quotesRouter } from './quotes.router.js';
export { quoteTemplatesRouter } from './quote-templates.router.js';
export { remindersRouter } from './reminders.router.js';

// Routers de configuración
export { authRouter } from './auth.router.js';
export { testAuthRouter } from './test-auth.router.js';
export { businessInfoRouter } from './business-info.router.js';
export { serviceRatesRouter } from './service-rates.router.js';
export { modulesRouter } from './modules.router.js';
export { invitationsRouter } from './invitations.router.js';
export { partnersRouter } from './partners.router.js';
export { onboardingRouter } from './onboarding.router.js';
export { languageRouter } from './language.router.js';

// Routers avanzados
export { advancedRouter } from './advanced.router.js';
export { seedRouter } from './seed.router.js';
export { usageRouter } from './usage.router.js';
export { alertsRouter } from './alerts.router.js';
export { alertSettingsRouter } from './alert-settings.router.js';
export { serviceIntervalSettingsRouter } from './service-interval-settings.router.js';
export { dashboardRouter } from './dashboard.router.js';
export { debugRouter } from './debug.router.js';



// Routers de equipos (existentes)
export { teamRouter, organizationsRouter, membersRouter, workAssignmentsRouter } from './team.router.js';
export { teamExtendedRouter, absencesRouter, metricsRouter, zonesRouter } from './team-extended.router.js';
