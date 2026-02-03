import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, int, varchar, timestamp, foreignKey, mysqlEnum, text, json, decimal, datetime, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const aiUsageTracking = mysqlTable("ai_usage_tracking", {
	id: int().autoincrement().notNull(),
	userId: varchar({ length: 64 }).notNull(),
	feature: varchar({ length: 50 }).notNull(),
	tokensUsed: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_feature_month").on(table.userId, table.feature, table.createdAt),
	index("idx_created_at").on(table.createdAt),
	index("idx_user_created").on(table.userId, table.createdAt),
]);

export const alertHistory = mysqlTable("alert_history", {
	id: int().autoincrement().notNull(),
	pianoId: int().notNull().references(() => pianos.id, { onDelete: "cascade" } ),
	clientId: int().notNull().references(() => clients.id, { onDelete: "cascade" } ),
	userId: int().notNull(),
	partnerId: int().default(1).notNull().references(() => partners.id, { onDelete: "cascade" } ),
	organizationId: int(),
	alertType: mysqlEnum(['tuning','regulation','repair']).notNull(),
	priority: mysqlEnum(['urgent','pending','ok']).notNull(),
	message: text().notNull(),
	daysSinceLastService: int().notNull(),
	status: mysqlEnum(['active','acknowledged','resolved','dismissed']).default('active'),
	acknowledgedAt: timestamp({ mode: 'string' }),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedByServiceId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_piano_status").on(table.pianoId, table.status),
	index("idx_user_status").on(table.userId, table.status),
	index("idx_created").on(table.createdAt),
	index("idx_priority").on(table.priority),
]);

export const alertNotifications = mysqlTable("alert_notifications", {
	id: int().autoincrement().notNull(),
	alertHistoryId: int().notNull().references(() => alertHistory.id, { onDelete: "cascade" } ),
	userId: int().notNull(),
	notificationType: mysqlEnum(['email','push','weekly_digest']).notNull(),
	status: mysqlEnum(['pending','sent','failed','opened']).default('pending'),
	sentAt: timestamp({ mode: 'string' }),
	openedAt: timestamp({ mode: 'string' }),
	recipientEmail: varchar({ length: 320 }),
	subject: varchar({ length: 255 }),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_alert_type").on(table.alertHistoryId, table.notificationType),
	index("idx_user_status").on(table.userId, table.status),
	index("idx_sent").on(table.sentAt),
]);

export const alertSettings = mysqlTable("alert_settings", {
	id: int().autoincrement().notNull(),
	userId: int(),
	partnerId: int().default(1).notNull().references(() => partners.id, { onDelete: "cascade" } ),
	organizationId: int(),
	// Umbrales de Pianos
	tuningPendingDays: int().default(180),
	tuningUrgentDays: int().default(270),
	regulationPendingDays: int().default(730),
	regulationUrgentDays: int().default(1095),
	
	// Citas y Servicios
	appointmentsNoticeDays: int().default(7),
	scheduledServicesNoticeDays: int().default(7),
	
	// Finanzas
	invoicesDueNoticeDays: int().default(7),
	quotesExpiryNoticeDays: int().default(7),
	contractsRenewalNoticeDays: int().default(30),
	overduePaymentsNoticeDays: int().default(15),
	
	// Inventario
	inventoryMinStock: int().default(5),
	inventoryExpiryNoticeDays: int().default(30),
	
	// Mantenimiento
	toolsMaintenanceDays: int().default(180),
	
	// Clientes
	clientFollowupDays: int().default(90),
	clientInactiveMonths: int().default(12),
	
	// Preferencias de Notificaciones
	emailNotificationsEnabled: tinyint().default(1),
	pushNotificationsEnabled: tinyint().default(0),
	weeklyDigestEnabled: tinyint().default(1),
	weeklyDigestDay: int().default(1),
	
	// UI/UX
	hasSeenAdvancedConfigTip: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("unique_user_config").on(table.userId, table.partnerId),
	index("unique_org_config").on(table.organizationId, table.partnerId),
]);

export const appointments = mysqlTable("appointments", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	clientId: int().notNull(),
	pianoId: int(),
	title: varchar({ length: 255 }).notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	duration: int().default(60).notNull(),
	serviceType: varchar({ length: 50 }),
	status: mysqlEnum(['scheduled','confirmed','completed','cancelled']).default('scheduled').notNull(),
	notes: text(),
	address: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const businessInfo = mysqlTable("businessInfo", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	taxId: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	postalCode: varchar({ length: 20 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	bankAccount: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
},
(table) => [
	index("businessInfo_odId_unique").on(table.odId),
]);

export const calendarConnections = mysqlTable("calendar_connections", {
	id: varchar({ length: 255 }).notNull(),
	userId: varchar({ length: 255 }).notNull(),
	provider: mysqlEnum(['google','microsoft']).notNull(),
	calendarId: varchar({ length: 255 }).notNull(),
	calendarName: varchar({ length: 255 }),
	accessToken: text().notNull(),
	refreshToken: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	webhookId: varchar({ length: 255 }),
	webhookExpiration: timestamp({ mode: 'string' }),
	lastSyncToken: text(),
	lastDeltaLink: text(),
	syncEnabled: tinyint().default(1),
	lastSyncAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user_provider").on(table.userId, table.provider),
	index("idx_webhook").on(table.webhookId),
	index("idx_sync_enabled").on(table.syncEnabled),
	index("idx_webhook_expiration").on(table.webhookExpiration),
]);

export const calendarSyncEvents = mysqlTable("calendar_sync_events", {
	id: varchar({ length: 255 }).notNull(),
	connectionId: varchar({ length: 255 }).notNull().references(() => calendarConnections.id, { onDelete: "cascade" } ),
	appointmentId: varchar({ length: 255 }),
	externalEventId: varchar({ length: 255 }).notNull(),
	provider: mysqlEnum(['google','microsoft']).notNull(),
	syncStatus: mysqlEnum(['synced','pending','error']).default('synced'),
	lastSyncedAt: timestamp({ mode: 'string' }),
	errorMessage: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_connection").on(table.connectionId),
	index("idx_appointment").on(table.appointmentId),
	index("idx_external").on(table.externalEventId, table.provider),
	index("idx_sync_status").on(table.syncStatus),
	index("unique_appointment_connection").on(table.appointmentId, table.connectionId),
]);

export const calendarSyncLog = mysqlTable("calendar_sync_log", {
	id: int().autoincrement().notNull(),
	connectionId: varchar({ length: 255 }).notNull(),
	action: mysqlEnum(['create','update','delete']).notNull(),
	direction: mysqlEnum(['to_external','from_external']).notNull(),
	appointmentId: varchar({ length: 255 }),
	externalEventId: varchar({ length: 255 }),
	status: mysqlEnum(['success','error']).notNull(),
	errorMessage: text(),
	details: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_connection_date").on(table.connectionId, table.createdAt),
	index("idx_status").on(table.status),
	index("idx_appointment").on(table.appointmentId),
	index("idx_created").on(table.createdAt),
]);

export const clientMessages = mysqlTable("client_messages", {
	id: varchar({ length: 255 }).notNull(),
	clientId: varchar({ length: 255 }).notNull(),
	fromUserId: varchar({ length: 255 }),
	fromClientPortalUserId: varchar({ length: 255 }),
	message: text().notNull(),
	isRead: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_clientId").on(table.clientId),
	index("idx_createdAt").on(table.createdAt),
	index("idx_isRead").on(table.isRead),
	index("idx_fromUserId").on(table.fromUserId),
	index("idx_fromClientPortalUserId").on(table.fromClientPortalUserId),
]);

export const clientPortalInvitations = mysqlTable("client_portal_invitations", {
	id: varchar({ length: 255 }).notNull(),
	clientId: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	usedAt: timestamp({ mode: 'string' }),
	createdBy: varchar({ length: 255 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_token").on(table.token),
	index("idx_clientId").on(table.clientId),
	index("idx_email").on(table.email),
	index("idx_expiresAt").on(table.expiresAt),
	index("token").on(table.token),
]);

export const clientPortalPasswordResets = mysqlTable("client_portal_password_resets", {
	id: varchar({ length: 255 }).notNull(),
	clientPortalUserId: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	usedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_token").on(table.token),
	index("idx_clientPortalUserId").on(table.clientPortalUserId),
	index("idx_expiresAt").on(table.expiresAt),
	index("token").on(table.token),
]);

export const clientPortalSessions = mysqlTable("client_portal_sessions", {
	id: varchar({ length: 255 }).notNull(),
	clientPortalUserId: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 512 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_token").on(table.token),
	index("idx_expiresAt").on(table.expiresAt),
	index("idx_clientPortalUserId").on(table.clientPortalUserId),
	index("token").on(table.token),
]);

export const clientPortalUsers = mysqlTable("client_portal_users", {
	id: varchar({ length: 255 }).notNull(),
	clientId: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar({ length: 255 }).notNull(),
	isActive: tinyint().default(1),
	lastLoginAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_clientId").on(table.clientId),
	index("idx_email").on(table.email),
	index("idx_isActive").on(table.isActive),
	index("email").on(table.email),
]);

export const clients = mysqlTable("clients", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	clientType: mysqlEnum(['particular','student','professional','music_school','conservatory','concert_hall']).default('particular').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	region: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	postalCode: varchar({ length: 20 }),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	routeGroup: varchar({ length: 50 }),
	partnerId: int().default(1).notNull(),
	organizationId: int(), // Columna existe en BD como 'organizationId' (camelCase)
});

export const distributorModuleConfig = mysqlTable("distributor_module_config", {
	id: int().autoincrement().notNull(),
	distributorId: int("distributor_id").notNull(),
	suppliersEnabled: tinyint("suppliers_enabled").default(1),
	inventoryEnabled: tinyint("inventory_enabled").default(1),
	invoicingEnabled: tinyint("invoicing_enabled").default(1),
	advancedInvoicingEnabled: tinyint("advanced_invoicing_enabled").default(0),
	accountingEnabled: tinyint("accounting_enabled").default(0),
	teamEnabled: tinyint("team_enabled").default(0),
	crmEnabled: tinyint("crm_enabled").default(0),
	reportsEnabled: tinyint("reports_enabled").default(0),
	shopEnabled: tinyint("shop_enabled").default(1),
	showPrices: tinyint("show_prices").default(1),
	allowDirectOrders: tinyint("allow_direct_orders").default(1),
	showStock: tinyint("show_stock").default(1),
	stockAlertsEnabled: tinyint("stock_alerts_enabled").default(1),
	customBranding: tinyint("custom_branding").default(0),
	hideCompetitorLinks: tinyint("hide_competitor_links").default(0),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("module_config_distributor_id_idx").on(table.distributorId),
	index("distributor_id").on(table.distributorId),
]);

export const helpItems = mysqlTable("help_items", {
	id: int().autoincrement().notNull(),
	sectionId: int("section_id").notNull().references(() => helpSections.id, { onDelete: "cascade" } ),
	question: text().notNull(),
	answer: text().notNull(),
	displayOrder: int("display_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const helpSections = mysqlTable("help_sections", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	displayOrder: int("display_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const inventory = mysqlTable("inventory", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['strings','hammers','dampers','keys','action_parts','pedals','tuning_pins','felts','tools','chemicals','other']).notNull(),
	description: text(),
	quantity: decimal({ precision: 10, scale: 2 }).default('0').notNull(),
	unit: varchar({ length: 20 }).default('unidad').notNull(),
	minStock: decimal({ precision: 10, scale: 2 }).default('0').notNull(),
	costPerUnit: decimal({ precision: 10, scale: 2 }),
	supplier: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const invitations = mysqlTable("invitations", {
	id: varchar({ length: 36 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	invitedBy: varchar("invited_by", { length: 320 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	used: tinyint().default(0).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
},
(table) => [
	index("email_used_idx").on(table.email, table.used),
	index("token_idx").on(table.token),
	index("expires_at_idx").on(table.expiresAt),
	index("token").on(table.token),
]);

export const invoices = mysqlTable("invoices", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	invoiceNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	clientName: varchar({ length: 255 }).notNull(),
	clientEmail: varchar({ length: 320 }),
	clientAddress: text(),
	date: timestamp({ mode: 'string' }).notNull(),
	dueDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['draft','sent','paid','cancelled']).default('draft').notNull(),
	items: json(),
	subtotal: decimal({ precision: 10, scale: 2 }).notNull(),
	taxAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	total: decimal({ precision: 10, scale: 2 }).notNull(),
	notes: text(),
	businessInfo: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const licenseBatches = mysqlTable("license_batches", {
	id: int().autoincrement().notNull(),
	batchCode: varchar("batch_code", { length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	distributorId: int("distributor_id"),
	templateId: int("template_id"),
	totalLicenses: int("total_licenses").notNull(),
	activatedLicenses: int("activated_licenses").default(0),
	licenseType: mysqlEnum("license_type", ['trial','free','starter','professional','enterprise']).notNull(),
	moduleConfig: json("module_config"),
	durationDays: int("duration_days"),
	createdByAdminId: int("created_by_admin_id"),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("license_batches_code_idx").on(table.batchCode),
	index("license_batches_distributor_idx").on(table.distributorId),
	index("batch_code").on(table.batchCode),
]);

export const licenseHistory = mysqlTable("license_history", {
	id: int().autoincrement().notNull(),
	licenseId: int("license_id").notNull(),
	action: mysqlEnum(['created','activated','deactivated','expired','revoked','suspended','reactivated','transferred','config_changed']).notNull(),
	previousStatus: mysqlEnum("previous_status", ['available','active','expired','revoked','suspended']),
	newStatus: mysqlEnum("new_status", ['available','active','expired','revoked','suspended']),
	performedByAdminId: int("performed_by_admin_id"),
	performedByUserId: int("performed_by_user_id"),
	details: json(),
	notes: text(),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("license_history_license_idx").on(table.licenseId),
	index("license_history_action_idx").on(table.action),
]);

export const licenseTemplates = mysqlTable("license_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	licenseType: mysqlEnum("license_type", ['trial','free','pro','premium']),
	durationDays: int("duration_days"),
	moduleConfig: json("module_config"),
	maxUsers: int("max_users").default(1),
	maxClients: int("max_clients"),
	maxPianos: int("max_pianos"),
	isActive: tinyint("is_active").default(1),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const licenses = mysqlTable("licenses", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	licenseType: mysqlEnum("license_type", ['trial','free','pro','premium']),
	status: mysqlEnum(['available','active','expired','revoked','suspended']).default('available'),
	distributorId: int("distributor_id"),
	templateId: int("template_id"),
	activatedByUserId: int("activated_by_user_id"),
	activatedAt: datetime("activated_at", { mode: 'string'}),
	moduleConfig: json("module_config"),
	maxUsers: int("max_users").default(1),
	maxClients: int("max_clients"),
	maxPianos: int("max_pianos"),
	validFrom: datetime("valid_from", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
	validUntil: datetime("valid_until", { mode: 'string'}),
	notes: text(),
	metadata: json(),
	createdByAdminId: int("created_by_admin_id"),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("licenses_code_idx").on(table.code),
	index("licenses_status_idx").on(table.status),
	index("licenses_distributor_idx").on(table.distributorId),
	index("licenses_activated_by_idx").on(table.activatedByUserId),
	index("code").on(table.code),
]);

export const memberAbsences = mysqlTable("member_absences", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	memberId: int().notNull(),
	absenceType: mysqlEnum(['vacation','sick_leave','personal','training','public_holiday','other']).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	isFullDay: tinyint().default(1),
	startTime: varchar({ length: 5 }),
	endTime: varchar({ length: 5 }),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("ma_member_idx").on(table.memberId),
	index("ma_date_idx").on(table.startDate, table.endDate),
]);

export const modules = mysqlTable("modules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	color: varchar({ length: 7 }),
	type: mysqlEnum(['core','free','premium','addon']).default('core').notNull(),
	includedInPlans: json(),
	addonPrice: decimal({ precision: 10, scale: 2 }),
	addonPriceCurrency: varchar({ length: 3 }).default('EUR'),
	dependencies: json(),
	sortOrder: int().default(0),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("modules_code_unique").on(table.code),
]);

export const organizationActivityLog = mysqlTable("organization_activity_log", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	userId: int().notNull(),
	activityType: mysqlEnum(['member_invited','member_joined','member_removed','member_role_changed','member_suspended','work_assigned','work_reassigned','work_completed','settings_changed','subscription_changed','invoice_created','client_created','service_completed']).notNull(),
	description: text().notNull(),
	metadata: json(),
	entityType: varchar({ length: 50 }),
	entityId: int(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("al_org_idx").on(table.organizationId),
	index("al_user_idx").on(table.userId),
	index("al_type_idx").on(table.activityType),
	index("al_date_idx").on(table.createdAt),
]);

export const organizationInvitations = mysqlTable("organization_invitations", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	organizationRole: mysqlEnum(['owner','admin','manager','senior_tech','technician','apprentice','receptionist','accountant','viewer']).default('technician').notNull(),
	token: varchar({ length: 64 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	invitedBy: int().notNull(),
	message: text(),
	acceptedAt: timestamp({ mode: 'string' }),
	acceptedByUserId: int(),
	declinedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("organization_invitations_token_unique").on(table.token),
	index("token_idx").on(table.token),
	index("email_org_idx").on(table.email, table.organizationId),
]);

export const organizationMembers = mysqlTable("organization_members", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	userId: int().notNull(),
	organizationRole: mysqlEnum(['owner','admin','manager','senior_tech','technician','apprentice','receptionist','accountant','viewer']).default('technician').notNull(),
	membershipStatus: mysqlEnum(['active','pending_invitation','suspended','inactive']).default('pending_invitation').notNull(),
	displayName: varchar({ length: 100 }),
	jobTitle: varchar({ length: 100 }),
	employeeId: varchar({ length: 50 }),
	phone: varchar({ length: 50 }),
	color: varchar({ length: 7 }),
	canBeAssigned: tinyint().default(1),
	maxDailyAppointments: int().default(8),
	workingHoursStart: varchar({ length: 5 }),
	workingHoursEnd: varchar({ length: 5 }),
	workingDays: json(),
	assignedZones: json(),
	specialties: json(),
	invitedAt: timestamp({ mode: 'string' }),
	invitedBy: int(),
	joinedAt: timestamp({ mode: 'string' }),
	lastActiveAt: timestamp({ mode: 'string' }),
	suspendedAt: timestamp({ mode: 'string' }),
	suspendedReason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("org_user_idx").on(table.organizationId, table.userId),
	index("org_idx").on(table.organizationId),
	index("user_idx").on(table.userId),
	index("status_idx").on(table.membershipStatus),
]);

export const organizationModules = mysqlTable("organization_modules", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	moduleCode: varchar({ length: 50 }).notNull(),
	isEnabled: tinyint().default(1),
	accessType: varchar({ length: 20 }).default('plan').notNull(),
	purchasedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }),
	settings: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("org_modules_idx").on(table.organizationId, table.moduleCode),
]);

export const organizationSharingSettings = mysqlTable("organization_sharing_settings", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	resource: mysqlEnum(['clients','pianos','services','appointments','inventory','invoices','quotes','reminders']).notNull(),
	sharingModel: mysqlEnum(['private','shared_read','shared_write']).default('private').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("org_resource_idx").on(table.organizationId, table.resource),
]);

export const organizations = mysqlTable("organizations", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	logo: text(),
	ownerId: int().notNull(),
	subscriptionPlan: mysqlEnum(['free','starter','team','business','enterprise']).default('free').notNull(),
	maxMembers: int().default(1).notNull(),
	subscriptionExpiresAt: timestamp({ mode: 'string' }),
	taxId: varchar({ length: 50 }),
	legalName: varchar({ length: 255 }),
	address: text(),
	city: varchar({ length: 100 }),
	postalCode: varchar({ length: 20 }),
	country: varchar({ length: 2 }).default('ES'),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	website: varchar({ length: 255 }),
	bankAccount: varchar({ length: 50 }),
	bankName: varchar({ length: 100 }),
	swiftBic: varchar({ length: 11 }),
	invoicePrefix: varchar({ length: 10 }).default('FAC'),
	invoiceNextNumber: int().default(1),
	defaultTaxRate: decimal({ precision: 5, scale: 2 }).default('21.00'),
	defaultCurrency: varchar({ length: 3 }).default('EUR'),
	defaultServiceDuration: int().default(60),
	workingHoursStart: varchar({ length: 5 }).default('09:00'),
	workingHoursEnd: varchar({ length: 5 }).default('18:00'),
	workingDays: json(),
	timezone: varchar({ length: 50 }).default('Europe/Madrid'),
	notifyOnNewAppointment: tinyint().default(1),
	notifyOnAssignment: tinyint().default(1),
	notifyOnCompletion: tinyint().default(1),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("organizations_slug_unique").on(table.slug),
]);

export const partnerPricing = mysqlTable("partner_pricing", {
	id: int().autoincrement().notNull(),
	partnerId: int().notNull().references(() => partners.id, { onDelete: "cascade" } ),
	planCode: mysqlEnum(['free','professional','premium']).notNull(),
	monthlyPrice: decimal({ precision: 10, scale: 2 }),
	yearlyPrice: decimal({ precision: 10, scale: 2 }),
	minMonthlyRevenue: decimal({ precision: 10, scale: 2 }),
	discountPercentage: int().default(0),
	customFeatures: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partnerSettings = mysqlTable("partner_settings", {
	id: int().autoincrement().notNull(),
	partnerId: int().notNull().references(() => partners.id, { onDelete: "cascade" } ),
	ecommerceEnabled: tinyint().default(0).notNull(),
	ecommerceApiUrl: text(),
	ecommerceApiKey: text(),
	autoOrderEnabled: tinyint().default(0).notNull(),
	autoOrderThreshold: int().default(5),
	notificationEmail: varchar({ length: 320 }),
	notificationWebhook: text(),
	maxUsers: int(),
	maxOrganizations: int(),
	supportedLanguages: json(),
	// Onboarding Step 6: Alertas
	alertPianoTuning: tinyint().default(1),
	alertPianoRegulation: tinyint().default(1),
	alertPianoMaintenance: tinyint().default(1),
	alertQuotesPending: tinyint().default(1),
	alertQuotesExpiring: tinyint().default(1),
	alertInvoicesPending: tinyint().default(1),
	alertInvoicesOverdue: tinyint().default(1),
	alertUpcomingAppointments: tinyint().default(1),
	alertUnconfirmedAppointments: tinyint().default(1),
	alertFrequency: mysqlEnum(['realtime','daily','weekly']).default('realtime'),
	// Onboarding Step 7: Notificaciones y Calendario
	pushNotifications: tinyint().default(1),
	emailNotifications: tinyint().default(1),
	calendarSync: mysqlEnum(['none','google','outlook']).default('none'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("partner_settings_partnerId_unique").on(table.partnerId),
]);

export const partnerUsers = mysqlTable("partner_users", {
	id: int().autoincrement().notNull(),
	partnerId: int().notNull().references(() => partners.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	role: mysqlEnum(['owner','admin','manager']).default('manager').notNull(),
	canManageBranding: tinyint().default(0).notNull(),
	canManagePricing: tinyint().default(0).notNull(),
	canManageUsers: tinyint().default(0).notNull(),
	canViewAnalytics: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partners = mysqlTable("partners", {
	id: int().autoincrement().notNull(),
	slug: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	customDomain: varchar({ length: 255 }),
	logo: text(),
	primaryColor: varchar({ length: 7 }).default('#3b82f6'),
	secondaryColor: varchar({ length: 7 }).default('#10b981'),
	brandName: varchar({ length: 255 }),
	status: mysqlEnum(['active','suspended','inactive']).default('active').notNull(),
	allowMultipleSuppliers: tinyint().default(0).notNull(),
	defaultLanguage: varchar({ length: 5 }).default('es').notNull(),
	supportEmail: varchar({ length: 320 }),
	supportPhone: varchar({ length: 50 }),
	// Onboarding Step 2: Datos Fiscales
	legalName: varchar({ length: 255 }),
	businessName: varchar({ length: 255 }),
	taxId: varchar({ length: 20 }),
	addressStreet: varchar({ length: 255 }),
	addressPostalCode: varchar({ length: 5 }),
	addressCity: varchar({ length: 100 }),
	addressProvince: varchar({ length: 100 }),
	iban: varchar({ length: 34 }),
	bankName: varchar({ length: 255 }),
	// Onboarding Step 3: Modo de Negocio
	businessMode: mysqlEnum(['individual','team']).default('individual'),
	// Onboarding Step 4: Cliente de Correo
	emailClientPreference: mysqlEnum(['gmail','outlook','default']).default('gmail'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("partners_slug_unique").on(table.slug),
]);

export const pianos = mysqlTable("pianos", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	clientId: int().notNull(),
	brand: varchar({ length: 100 }).notNull(),
	model: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	year: int(),
	category: mysqlEnum(['vertical','grand']).default('vertical').notNull(),
	pianoType: varchar({ length: 50 }).notNull(),
	condition: mysqlEnum(['excellent','good','fair','poor','needs_repair']).default('good').notNull(),
	location: text(),
	notes: text(),
	photos: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
	tuningIntervalDays: int().default(180),
	regulationIntervalDays: int().default(730),
	alertsEnabled: tinyint().default(1),
	customThresholdsEnabled: tinyint().default(0),
});

export const platformAdmins = mysqlTable("platform_admins", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	role: mysqlEnum(['super_admin','admin','support']).default('admin'),
	permissions: json(),
	isActive: tinyint("is_active").default(1),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("platform_admins_user_id_idx").on(table.userId),
	index("user_id").on(table.userId),
]);

export const quoteTemplates = mysqlTable("quoteTemplates", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['tuning','repair','restoration','maintenance','moving','evaluation','custom']).default('custom').notNull(),
	items: json(),
	isDefault: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const quotes = mysqlTable("quotes", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	quoteNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	clientName: varchar({ length: 255 }).notNull(),
	clientEmail: varchar({ length: 320 }),
	clientAddress: text(),
	pianoId: int(),
	pianoDescription: varchar({ length: 255 }),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	date: timestamp({ mode: 'string' }).notNull(),
	validUntil: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['draft','sent','accepted','rejected','expired','converted']).default('draft').notNull(),
	items: json(),
	subtotal: decimal({ precision: 10, scale: 2 }).notNull(),
	totalDiscount: decimal({ precision: 10, scale: 2 }).default('0').notNull(),
	taxAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	total: decimal({ precision: 10, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('EUR').notNull(),
	notes: text(),
	termsAndConditions: text(),
	sentAt: timestamp({ mode: 'string' }),
	acceptedAt: timestamp({ mode: 'string' }),
	rejectedAt: timestamp({ mode: 'string' }),
	convertedToInvoiceId: int(),
	businessInfo: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const reminders = mysqlTable("reminders", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	clientId: int().notNull(),
	pianoId: int(),
	reminderType: mysqlEnum(['call','visit','email','whatsapp','follow_up']).notNull(),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	notes: text(),
	isCompleted: tinyint().default(0).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const serviceRates = mysqlTable("serviceRates", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['tuning','maintenance','regulation','repair','restoration','inspection','other']).notNull(),
	basePrice: decimal({ precision: 10, scale: 2 }).notNull(),
	taxRate: int().default(21).notNull(),
	estimatedDuration: int(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const serviceZones = mysqlTable("service_zones", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 7 }),
	postalCodes: json(),
	cities: json(),
	geoJson: json(),
	isActive: tinyint().default(1).notNull(),
	surchargePercent: decimal({ precision: 5, scale: 2 }).default('0'),
	estimatedTravelTime: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("sz_org_idx").on(table.organizationId),
]);

export const services = mysqlTable("services", {
	id: int().autoincrement().notNull(),
	odId: varchar({ length: 64 }).notNull(),
	pianoId: int().notNull(),
	clientId: int().notNull(),
	serviceType: mysqlEnum(['tuning','repair','regulation','maintenance_basic','maintenance_complete','maintenance_premium','inspection','restoration','other']).notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	cost: decimal({ precision: 10, scale: 2 }),
	duration: int(),
	tasks: json(),
	notes: text(),
	technicianNotes: text(),
	materialsUsed: json(),
	photosBefore: json(),
	photosAfter: json(),
	clientSignature: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	humidity: decimal({ precision: 5, scale: 2 }),
	temperature: decimal({ precision: 5, scale: 2 }),
	partnerId: int().default(1).notNull(),
	organizationId: int(),
});

export const subscriptionPlans = mysqlTable("subscription_plans", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).default('0').notNull(),
	yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).default('0').notNull(),
	currency: varchar({ length: 3 }).default('EUR'),
	maxUsers: int("max_users"),
	maxClients: int("max_clients"),
	maxPianos: int("max_pianos"),
	maxInvoicesPerMonth: int("max_invoices_per_month"),
	maxStorageMb: int("max_storage_mb"),
	features: json(),
	isActive: tinyint("is_active").default(1).notNull(),
	isPopular: tinyint("is_popular").default(0),
	trialDays: int("trial_days").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("subscription_plans_code_unique").on(table.code),
]);

export const technicianMetrics = mysqlTable("technician_metrics", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	memberId: int().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	appointmentsScheduled: int().default(0),
	appointmentsCompleted: int().default(0),
	appointmentsCancelled: int().default(0),
	servicesCompleted: int().default(0),
	totalWorkMinutes: int().default(0),
	totalTravelMinutes: int().default(0),
	averageServiceDuration: int(),
	totalRevenue: decimal({ precision: 10, scale: 2 }).default('0'),
	totalMaterialsCost: decimal({ precision: 10, scale: 2 }).default('0'),
	averageRating: decimal({ precision: 3, scale: 2 }),
	ratingsCount: int().default(0),
	complaintsCount: int().default(0),
	onTimeArrivals: int().default(0),
	lateArrivals: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("tm_member_date_idx").on(table.memberId, table.date),
	index("tm_org_date_idx").on(table.organizationId, table.date),
]);

export const technicianZones = mysqlTable("technician_zones", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	memberId: int().notNull(),
	zoneId: int().notNull(),
	isPrimary: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("member_zone_idx").on(table.memberId, table.zoneId),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull().unique(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	stripeCustomerId: varchar({ length: 255 }),
	subscriptionPlan: mysqlEnum(['free','pro','premium']).default('free').notNull(),
	subscriptionStatus: mysqlEnum(['active','canceled','past_due','trialing','none']).default('none').notNull(),
	subscriptionId: varchar({ length: 255 }),
	subscriptionEndDate: timestamp({ mode: 'string' }),
	partnerId: int().default(1).notNull(),
	preferredLanguage: varchar({ length: 5 }),
	smtpHost: varchar({ length: 255 }),
	smtpPort: int().default(587),
	smtpUser: varchar({ length: 320 }),
	smtpPassword: text(),
	smtpSecure: tinyint().default(0),
	smtpFromName: varchar({ length: 255 }),
	clerkId: varchar({ length: 255 }),
	purchasesLast30Days: int('purchases_last_30_days').default(0),
	lastPurchaseDate: timestamp('last_purchase_date', { mode: 'string' }),
	trialEndsAt: timestamp('trial_ends_at', { mode: 'string' }),
	distributorId: int('distributor_id'),
	settings: text(),
	});

export const workAssignments = mysqlTable("work_assignments", {
	id: int().autoincrement().notNull(),
	organizationId: int().notNull(),
	appointmentId: int(),
	serviceId: int(),
	technicianId: int().notNull(),
	workAssignmentStatus: mysqlEnum(['unassigned','assigned','accepted','in_progress','completed','cancelled','reassigned']).default('assigned').notNull(),
	workPriority: mysqlEnum(['low','normal','high','urgent']).default('normal').notNull(),
	scheduledDate: timestamp({ mode: 'string' }).notNull(),
	scheduledStartTime: varchar({ length: 5 }),
	scheduledEndTime: varchar({ length: 5 }),
	estimatedDuration: int(),
	actualStartTime: timestamp({ mode: 'string' }),
	actualEndTime: timestamp({ mode: 'string' }),
	assignedBy: int().notNull(),
	assignedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	previousTechnicianId: int(),
	reassignedAt: timestamp({ mode: 'string' }),
	reassignmentReason: text(),
	assignmentNotes: text(),
	technicianNotes: text(),
	latitude: decimal({ precision: 10, scale: 8 }),
	longitude: decimal({ precision: 11, scale: 8 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("wa_org_idx").on(table.organizationId),
	index("wa_tech_idx").on(table.technicianId),
	index("wa_date_idx").on(table.scheduledDate),
	index("wa_status_idx").on(table.workAssignmentStatus),
]);

// Alert Dismissals
// (alerts-schema removed - using alertSettings table in main schema)

// ============================================================================
// ONBOARDING STEP 5: SERVICE TYPES AND TASKS
// ============================================================================

export const serviceTypes = mysqlTable("service_types", {
	id: int().autoincrement().notNull(),
	partnerId: int().notNull().references(() => partners.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	duration: int().notNull(), // en minutos
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("service_types_partner_idx").on(table.partnerId),
	index("service_types_active_idx").on(table.isActive),
]);

export const serviceTasks = mysqlTable("service_tasks", {
	id: int().autoincrement().notNull(),
	serviceTypeId: int().notNull().references(() => serviceTypes.id, { onDelete: "cascade" } ),
	description: varchar({ length: 500 }).notNull(),
	orderIndex: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("service_tasks_type_idx").on(table.serviceTypeId),
	index("service_tasks_order_idx").on(table.serviceTypeId, table.orderIndex),
]);

// ============================================================================
// ACCOUNTING TABLES
// ============================================================================

export * from './accounting-schema.js';

// ============================================================================
// DISTRIBUTOR TABLES
// ============================================================================
export * from './distributor-schema.js';
export * from './crm-schema.js';
