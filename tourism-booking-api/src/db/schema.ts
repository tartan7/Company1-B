import { pgTable, bigint, varchar, text, date, time, integer, boolean, timestamp, numeric, index, check, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ==================== USERS TABLE ====================
export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    profileImage: text('profile_image'),
    bio: text('bio'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_deleted_at').on(table.deletedAt),
  ]
);

// ==================== ACTIVITIES TABLE ====================
export const activities = pgTable(
  'activities',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    hostId: bigint('host_id', { mode: 'bigint' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    pricePerPerson: numeric('price_per_person', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    maxCapacity: integer('max_capacity').notNull(),
    duration: integer('duration').notNull(), // in minutes
    location: varchar('location', { length: 255 }).notNull(),
    latitude: numeric('latitude', { precision: 10, scale: 8 }),
    longitude: numeric('longitude', { precision: 11, scale: 8 }),
    mainImage: text('main_image'),
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, archived
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at'),
    publishedBy: bigint('published_by', { mode: 'bigint' }),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.hostId], foreignColumns: [users.id], name: 'activities_host_id_fkey' })
      .onDelete('restrict'),
    foreignKey({ columns: [table.publishedBy], foreignColumns: [users.id], name: 'activities_published_by_fkey' })
      .onDelete('setNull'),
    index('idx_activities_host_id').on(table.hostId),
    index('idx_activities_status').on(table.status),
    index('idx_activities_deleted_at').on(table.deletedAt),
    index('idx_activities_category').on(table.category),
    index('idx_activities_version').on(table.version),
  ]
);

// ==================== SCHEDULES TABLE ====================
export const schedules = pgTable(
  'schedules',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    activityId: bigint('activity_id', { mode: 'bigint' }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(), // HH:mm format
    endTime: varchar('end_time', { length: 5 }).notNull(), // HH:mm format
    timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'), // IANA timezone
    totalSlots: integer('total_slots').notNull(),
    bookedSlots: integer('booked_slots').notNull().default(0),
    operatorId: bigint('operator_id', { mode: 'bigint' }).notNull(),
    version: integer('version').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    publishedBy: bigint('published_by', { mode: 'bigint' }),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.activityId], foreignColumns: [activities.id], name: 'schedules_activity_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.operatorId], foreignColumns: [users.id], name: 'schedules_operator_id_fkey' })
      .onDelete('restrict'),
    foreignKey({ columns: [table.publishedBy], foreignColumns: [users.id], name: 'schedules_published_by_fkey' })
      .onDelete('setNull'),
    check('booked_slots_le_total_slots', sql`booked_slots <= total_slots`),
    index('idx_schedules_activity_id').on(table.activityId),
    index('idx_schedules_activity_booked_slots').on(table.activityId, table.bookedSlots),
    index('idx_schedules_operator_id').on(table.operatorId),
    index('idx_schedules_is_deleted').on(table.isDeleted),
    index('idx_schedules_start_date').on(table.startDate),
    index('idx_schedules_version').on(table.version),
  ]
);

// ==================== BOOKINGS TABLE ====================
export const bookings = pgTable(
  'bookings',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    guestId: bigint('guest_id', { mode: 'bigint' }).notNull(),
    scheduleId: bigint('schedule_id', { mode: 'bigint' }).notNull(),
    activityId: bigint('activity_id', { mode: 'bigint' }).notNull(),
    quantity: integer('quantity').notNull(),
    bookingDate: date('booking_date').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, confirmed, cancelled, completed
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at'),
    publishedBy: bigint('published_by', { mode: 'bigint' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.guestId], foreignColumns: [users.id], name: 'bookings_guest_id_fkey' })
      .onDelete('restrict'),
    foreignKey({ columns: [table.scheduleId], foreignColumns: [schedules.id], name: 'bookings_schedule_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.activityId], foreignColumns: [activities.id], name: 'bookings_activity_id_fkey' })
      .onDelete('restrict'),
    foreignKey({ columns: [table.publishedBy], foreignColumns: [users.id], name: 'bookings_published_by_fkey' })
      .onDelete('setNull'),
    index('idx_bookings_guest_id').on(table.guestId),
    index('idx_bookings_schedule_id').on(table.scheduleId),
    index('idx_bookings_activity_id').on(table.activityId),
    index('idx_bookings_status').on(table.status),
    index('idx_bookings_booking_date').on(table.bookingDate),
    index('idx_bookings_version').on(table.version),
  ]
);

// ==================== PAYMENTS TABLE ====================
export const payments = pgTable(
  'payments',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    bookingId: bigint('booking_id', { mode: 'bigint' }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull(), // credit_card, debit_card, paypal, bank_transfer
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, completed, failed, refunded
    transactionId: varchar('transaction_id', { length: 255 }),
    processedAt: timestamp('processed_at'),
    failureReason: text('failure_reason'),
    metadata: text('metadata'), // JSON metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.bookingId], foreignColumns: [bookings.id], name: 'payments_booking_id_fkey' })
      .onDelete('cascade'),
    index('idx_payments_booking_id').on(table.bookingId),
    index('idx_payments_status').on(table.status),
    index('idx_payments_transaction_id').on(table.transactionId),
    index('idx_payments_processed_at').on(table.processedAt),
  ]
);

// ==================== REVIEWS TABLE ====================
export const reviews = pgTable(
  'reviews',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    bookingId: bigint('booking_id', { mode: 'bigint' }).notNull(),
    activityId: bigint('activity_id', { mode: 'bigint' }).notNull(),
    guestId: bigint('guest_id', { mode: 'bigint' }).notNull(),
    rating: integer('rating').notNull(), // 1-5 scale
    title: varchar('title', { length: 255 }).notNull(),
    comment: text('comment'),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.bookingId], foreignColumns: [bookings.id], name: 'reviews_booking_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.activityId], foreignColumns: [activities.id], name: 'reviews_activity_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.guestId], foreignColumns: [users.id], name: 'reviews_guest_id_fkey' })
      .onDelete('restrict'),
    check('rating_range', sql`rating >= 1 AND rating <= 5`),
    uniqueIndex('idx_reviews_unique_booking').on(table.bookingId),
    index('idx_reviews_activity_id').on(table.activityId),
    index('idx_reviews_guest_id').on(table.guestId),
    index('idx_reviews_rating').on(table.rating),
  ]
);

// ==================== AUDIT_LOGS TABLE ====================
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    operationType: varchar('operation_type', { length: 50 }).notNull(), // create, update, delete, sync, etc.
    resourceType: varchar('resource_type', { length: 100 }).notNull(), // user, booking, schedule, activity, organization, etc.
    resourceId: varchar('resource_id', { length: 255 }).notNull(), // ID of affected resource
    actorType: varchar('actor_type', { length: 50 }).notNull().default('user'), // user, system, agent, api
    actorId: varchar('actor_id', { length: 255 }), // user_id or system identifier
    beforeState: text('before_state'), // JSON representation of state before change
    afterState: text('after_state'), // JSON representation of state after change
    description: text('description'), // Human-readable description of the change
    operationTimestamp: timestamp('operation_timestamp').notNull(), // When the operation occurred
    createdAt: timestamp('created_at').notNull().defaultNow(), // When log was recorded
  },
  (table) => [
    index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    index('idx_audit_logs_timestamp').on(table.operationTimestamp),
    index('idx_audit_logs_operation_type').on(table.operationType),
    index('idx_audit_logs_actor').on(table.actorType, table.actorId),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
);

// ==================== ORGANIZATIONS TABLE ====================
export const organizations = pgTable(
  'organizations',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    pleasanterId: bigint('pleasanter_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_organizations_pleasanter_id').on(table.pleasanterId),
  ]
);

// ==================== ROLES TABLE ====================
export const roles = pgTable(
  'roles',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    organizationId: bigint('organization_id', { mode: 'bigint' }).notNull(),
    pleasanterId: bigint('pleasanter_id', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.organizationId], foreignColumns: [organizations.id], name: 'roles_organization_id_fkey' })
      .onDelete('cascade'),
    index('idx_roles_organization_id').on(table.organizationId),
    index('idx_roles_pleasanter_id').on(table.pleasanterId),
  ]
);

// ==================== PERMISSIONS TABLE ====================
export const permissions = pgTable(
  'permissions',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    resource: varchar('resource', { length: 100 }).notNull(), // e.g., 'users', 'bookings', 'activities'
    action: varchar('action', { length: 50 }).notNull(), // e.g., 'create', 'read', 'update', 'delete'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_permissions_resource_action').on(table.resource, table.action),
  ]
);

// ==================== ROLE_PERMISSIONS TABLE ====================
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: bigint('role_id', { mode: 'bigint' }).notNull(),
    permissionId: bigint('permission_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.roleId], foreignColumns: [roles.id], name: 'role_permissions_role_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.permissionId], foreignColumns: [permissions.id], name: 'role_permissions_permission_id_fkey' })
      .onDelete('cascade'),
    { primaryKey: { columns: [table.roleId, table.permissionId], name: 'role_permissions_pkey' } },
    index('idx_role_permissions_role_id').on(table.roleId),
    index('idx_role_permissions_permission_id').on(table.permissionId),
  ]
);

// ==================== USER_ROLES TABLE ====================
export const userRoles = pgTable(
  'user_roles',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    roleId: bigint('role_id', { mode: 'bigint' }).notNull(),
    organizationId: bigint('organization_id', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'user_roles_user_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.roleId], foreignColumns: [roles.id], name: 'user_roles_role_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.organizationId], foreignColumns: [organizations.id], name: 'user_roles_organization_id_fkey' })
      .onDelete('cascade'),
    { primaryKey: { columns: [table.userId, table.roleId, table.organizationId], name: 'user_roles_pkey' } },
    index('idx_user_roles_user_id').on(table.userId),
    index('idx_user_roles_role_id').on(table.roleId),
    index('idx_user_roles_organization_id').on(table.organizationId),
  ]
);

// ==================== USER_PLEASANTER_MAPPING TABLE ====================
export const userPleasanterMappings = pgTable(
  'user_pleasanter_mappings',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    pleasanterUserId: bigint('pleasanter_user_id', { mode: 'bigint' }).notNull(),
    localUserId: bigint('local_user_id', { mode: 'bigint' }).notNull(),
    organizationId: bigint('organization_id', { mode: 'bigint' }).notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    lastKnownRoles: text('last_known_roles').notNull(), // JSON array of role names
    syncStatus: varchar('sync_status', { length: 50 }).notNull().default('synced'), // synced, stale, conflict, pending_deletion
    conflictReason: text('conflict_reason'), // Description of any conflict
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.localUserId], foreignColumns: [users.id], name: 'user_pleasanter_mappings_local_user_id_fkey' })
      .onDelete('cascade'),
    foreignKey({ columns: [table.organizationId], foreignColumns: [organizations.id], name: 'user_pleasanter_mappings_organization_id_fkey' })
      .onDelete('cascade'),
    { unique: 'idx_user_pleasanter_mappings_unique', columns: [table.pleasanterUserId, table.organizationId] },
    { unique: 'idx_user_pleasanter_mappings_user_unique', columns: [table.localUserId, table.organizationId] },
    index('idx_user_pleasanter_mappings_status').on(table.syncStatus),
    index('idx_user_pleasanter_mappings_last_sync').on(table.lastSyncAt),
  ]
);

// ==================== TENANT_MAPPINGS TABLE ====================
export const tenantMappings = pgTable(
  'tenant_mappings',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    pleasanterOrgId: varchar('pleasanter_org_id', { length: 255 }).notNull(),
    localTenantId: varchar('local_tenant_id', { length: 255 }).notNull(),
    pleasanterOrgName: varchar('pleasanter_org_name', { length: 255 }).notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull().defaultNow(),
    syncVersion: integer('sync_version').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    markedDeletedAt: timestamp('marked_deleted_at'),
    metadata: text('metadata'), // JSON object for extra Pleasanter fields
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.localTenantId], foreignColumns: [organizations.id], name: 'tenant_mappings_local_tenant_id_fkey' })
      .onDelete('cascade'),
    index('idx_tenant_mappings_pleasanter_org_id').on(table.pleasanterOrgId),
    index('idx_tenant_mappings_local_tenant_id').on(table.localTenantId),
    index('idx_tenant_mappings_last_sync').on(table.lastSyncAt),
    index('idx_tenant_mappings_is_active').on(table.isActive),
    { unique: 'idx_tenant_mappings_unique', columns: [table.pleasanterOrgId, table.localTenantId] },
  ]
);

// ==================== SYNC_RECONCILIATION_LOG TABLE ====================
export const syncReconciliationLogs = pgTable(
  'sync_reconciliation_logs',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    organizationId: bigint('organization_id', { mode: 'bigint' }).notNull(),
    syncBatchId: varchar('sync_batch_id', { length: 255 }).notNull(),
    conflictType: varchar('conflict_type', { length: 100 }).notNull(), // user_deleted, role_changed, permission_mismatch, etc.
    pleasanterResourceId: bigint('pleasanter_resource_id', { mode: 'bigint' }).notNull(),
    expectedState: text('expected_state').notNull(), // JSON representation
    actualState: text('actual_state').notNull(), // JSON representation
    resolution: varchar('resolution', { length: 100 }).notNull(), // auto_resolved, manual_review_pending, escalated
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: varchar('resolved_by', { length: 255 }), // who/what resolved it
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.organizationId], foreignColumns: [organizations.id], name: 'sync_reconciliation_logs_organization_id_fkey' })
      .onDelete('cascade'),
    index('idx_sync_reconciliation_logs_batch').on(table.syncBatchId),
    index('idx_sync_reconciliation_logs_type').on(table.conflictType),
    index('idx_sync_reconciliation_logs_resolution').on(table.resolution),
    index('idx_sync_reconciliation_logs_created_at').on(table.createdAt),
  ]
);

// ==================== RESOURCE_VERSIONS TABLE ====================
export const resourceVersions = pgTable(
  'resource_versions',
  {
    id: bigint('id', { mode: 'bigserial' }).primaryKey(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'activity', 'schedule', 'booking'
    resourceId: bigint('resource_id', { mode: 'bigint' }).notNull(),
    version: integer('version').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // 'draft', 'published', 'archived'
    data: text('data').notNull(), // JSON snapshot
    publishedAt: timestamp('published_at'),
    publishedBy: bigint('published_by', { mode: 'bigint' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
  },
  (table) => [
    foreignKey({ columns: [table.publishedBy], foreignColumns: [users.id], name: 'resource_versions_published_by_fkey' })
      .onDelete('setNull'),
    check('resource_type_valid', sql`resource_type IN ('activity', 'schedule', 'booking')`),
    check('status_valid', sql`status IN ('draft', 'published', 'archived')`),
    { unique: 'resource_versions_unique_version', columns: [table.resourceType, table.resourceId, table.version] },
    index('idx_resource_versions_type_id').on(table.resourceType, table.resourceId),
    index('idx_resource_versions_type_id_status').on(table.resourceType, table.resourceId, table.status),
    index('idx_resource_versions_published_at').on(table.publishedAt),
    index('idx_resource_versions_is_deleted').on(table.isDeleted),
  ]
);

// ==================== TYPE EXPORTS ====================
export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type ActivityInsert = typeof activities.$inferInsert;

export type Schedule = typeof schedules.$inferSelect;
export type ScheduleInsert = typeof schedules.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type ReviewInsert = typeof reviews.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type RoleInsert = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type PermissionInsert = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type RolePermissionInsert = typeof rolePermissions.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type UserRoleInsert = typeof userRoles.$inferInsert;

export type UserPleasanterMapping = typeof userPleasanterMappings.$inferSelect;
export type UserPleasanterMappingInsert = typeof userPleasanterMappings.$inferInsert;

export type TenantMapping = typeof tenantMappings.$inferSelect;
export type TenantMappingInsert = typeof tenantMappings.$inferInsert;

export type SyncReconciliationLog = typeof syncReconciliationLogs.$inferSelect;
export type SyncReconciliationLogInsert = typeof syncReconciliationLogs.$inferInsert;

export type ResourceVersion = typeof resourceVersions.$inferSelect;
export type ResourceVersionInsert = typeof resourceVersions.$inferInsert;
