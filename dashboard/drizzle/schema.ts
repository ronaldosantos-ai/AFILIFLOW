import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table - supports both OAuth and email/password authentication
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional for email/password auth
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password auth
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }), // 'oauth' or 'email'
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isAuthorized: boolean("isAuthorized").default(false).notNull(), // For email/password: needs admin approval
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"), // Nullable - only set on actual login
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Posts table: stores published affiliate products
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: text("productName").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  affiliateUrl: varchar("affiliateUrl", { length: 512 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["published", "failed", "pending"]).default("pending").notNull(),
  publishedChannels: json("publishedChannels").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Pipeline configuration table
 */
export const pipelineConfig = mysqlTable("pipelineConfig", {
  id: int("id").autoincrement().primaryKey(),
  scheduleTimes: json("scheduleTimes").$type<string[]>().default(["09:00", "15:00", "21:00"]).notNull(),
  keywords: json("keywords").$type<Record<string, string>>().default({}).notNull(),
  maxPrice: decimal("maxPrice", { precision: 10, scale: 2 }).default("1000.00").notNull(),
  minRating: decimal("minRating", { precision: 3, scale: 1 }).default("3.5").notNull(),
  activeCategories: json("activeCategories").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineConfig = typeof pipelineConfig.$inferSelect;
export type InsertPipelineConfig = typeof pipelineConfig.$inferInsert;

/**
 * Execution logs table
 */
export const executionLogs = mysqlTable("executionLogs", {
  id: int("id").autoincrement().primaryKey(),
  executionId: varchar("executionId", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["success", "error", "partial"]).notNull(),
  productFound: varchar("productFound", { length: 64 }),
  productName: text("productName"),
  channelsPublished: json("channelsPublished").$type<string[]>().default([]).notNull(),
  errorMessage: text("errorMessage"),
  executionTime: int("executionTime"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;

/**
 * Integration status table
 */
export const integrationStatus = mysqlTable("integrationStatus", {
  id: int("id").autoincrement().primaryKey(),
  integrationName: mysqlEnum("integrationName", ["shopee", "telegram", "buffer_instagram", "gemini"]).notNull().unique(),
  status: mysqlEnum("status", ["healthy", "warning", "error"]).default("healthy").notNull(),
  lastCheck: timestamp("lastCheck").defaultNow().notNull(),
  errorMessage: text("errorMessage"),
  responseTime: int("responseTime"), // milliseconds
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationStatus = typeof integrationStatus.$inferSelect;
export type InsertIntegrationStatus = typeof integrationStatus.$inferInsert;

/**
 * Cache items table: tracks published products to avoid duplicates
 */
export const cacheItems = mysqlTable("cacheItems", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull().unique(),
  productName: text("productName").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CacheItem = typeof cacheItems.$inferSelect;
export type InsertCacheItem = typeof cacheItems.$inferInsert;

/**
 * Metrics snapshot table: stores historical metrics for trending
 */
export const metricsSnapshots = mysqlTable("metricsSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  totalPublished: int("totalPublished").default(0).notNull(),
  telegramSuccess: int("telegramSuccess").default(0).notNull(),
  instagramSuccess: int("instagramSuccess").default(0).notNull(),
  facebookSuccess: int("facebookSuccess").default(0).notNull(),
  totalFailed: int("totalFailed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MetricsSnapshot = typeof metricsSnapshots.$inferSelect;
export type InsertMetricsSnapshot = typeof metricsSnapshots.$inferInsert;

/**
 * Content approval table: stores pending content for admin review
 */
export const contentApprovals = mysqlTable("contentApprovals", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  productName: text("productName").notNull(),
  productImage: varchar("productImage", { length: 512 }),
  description: text("description"),
  affiliateUrl: varchar("affiliateUrl", { length: 512 }).notNull(),
  proposedChannels: json("proposedChannels").$type<string[]>().default([]).notNull(),
  telegramApproved: boolean("telegramApproved").default(false).notNull(),
  instagramApproved: boolean("instagramApproved").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "partially_approved"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  editHistory: json("editHistory").$type<Array<{version: number, description: string, editedAt: string, editedBy: number}>>().default([]).notNull(),
  currentVersion: int("currentVersion").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
});

export type ContentApproval = typeof contentApprovals.$inferSelect;
export type InsertContentApproval = typeof contentApprovals.$inferInsert;

/**
 * Integration settings table: stores API keys and configuration
 */
export const integrationSettings = mysqlTable("integrationSettings", {
  id: int("id").autoincrement().primaryKey(),
  integrationName: varchar("integrationName", { length: 64 }).notNull().unique(),
  // Meta API
  metaAppId: varchar("metaAppId", { length: 255 }),
  metaAppSecret: varchar("metaAppSecret", { length: 255 }),
  metaPageAccessToken: varchar("metaPageAccessToken", { length: 255 }),
  metaPageId: varchar("metaPageId", { length: 255 }),
  metaInstagramAccountId: varchar("metaInstagramAccountId", { length: 255 }),
  // Telegram
  telegramBotToken: varchar("telegramBotToken", { length: 255 }),
  telegramChatId: varchar("telegramChatId", { length: 255 }),
  // Shopee
  shopeeApiKey: varchar("shopeeApiKey", { length: 255 }),
  shopeePartnerId: varchar("shopeePartnerId", { length: 255 }),
  // GTM
  gtmId: varchar("gtmId", { length: 255 }),
  // Gemini
  geminiApiKey: varchar("geminiApiKey", { length: 255 }),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSettings = typeof integrationSettings.$inferInsert;

/**
 * Audit log table: tracks all user actions for compliance and debugging
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", [
    "content_approved_telegram",
    "content_approved_instagram",
    "content_rejected",
    "content_edited",
    "content_published",
    "user_promoted_admin",
    "user_approved",
    "user_rejected",
    "config_updated",
    "integration_updated",
  ]).notNull(),
  targetType: mysqlEnum("targetType", ["content", "user", "config", "integration"]).notNull(),
  targetId: int("targetId"),
  description: text("description"),
  details: json("details").$type<Record<string, any>>().default({}).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Manual posts table: stores manually created posts for publishing
 */
export const manualPosts = mysqlTable("manualPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productUrl: varchar("productUrl", { length: 512 }).notNull(),
  productName: text("productName").notNull(),
  productPrice: decimal("productPrice", { precision: 10, scale: 2 }),
  productImage: varchar("productImage", { length: 512 }),
  productDescription: text("productDescription"),
  affiliateUrl: varchar("affiliateUrl", { length: 512 }),
  aidaDescription: text("aidaDescription"),
  generatedImage: varchar("generatedImage", { length: 512 }),
  editedDescription: text("editedDescription"),
  publishChannels: json("publishChannels").$type<string[]>().default([]).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "published"]).default("draft").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManualPost = typeof manualPosts.$inferSelect;
export type InsertManualPost = typeof manualPosts.$inferInsert;

/**
 * Copy Tracking table: tracks when users copy content fields
 */
export const copyTracking = mysqlTable("copyTracking", {
  id: int("id").autoincrement().primaryKey(),
  contentApprovalId: int("contentApprovalId").notNull(),
  fieldName: varchar("fieldName", { length: 64 }).notNull(), // 'title', 'description', 'hashtags', 'url'
  copiedText: text("copiedText"),
  userId: int("userId"),
  copiedAt: timestamp("copiedAt").defaultNow().notNull(),
});

export type CopyTracking = typeof copyTracking.$inferSelect;
export type InsertCopyTracking = typeof copyTracking.$inferInsert;
