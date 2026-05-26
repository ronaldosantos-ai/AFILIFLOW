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

// ─────────────────────────────────────────────────────────
// AdTracker — domínio de atribuição e tracking de Meta Ads
// ─────────────────────────────────────────────────────────

export const adAccounts = mysqlTable("adAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["meta", "google", "tiktok", "pinterest"]).default("meta").notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  accessTokenEncrypted: text("accessTokenEncrypted"),
  refreshTokenEncrypted: text("refreshTokenEncrypted"),
  currency: varchar("currency", { length: 12 }).default("BRL").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = typeof adAccounts.$inferInsert;

export const pixels = mysqlTable("pixels", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  pixelId: varchar("pixelId", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Pixel = typeof pixels.$inferSelect;
export type InsertPixel = typeof pixels.$inferInsert;

export const conversions = mysqlTable("conversions", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  pixelId: int("pixelId"),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  triggerType: mysqlEnum("triggerType", ["page_access", "element_view", "click"]).notNull(),
  eventType: mysqlEnum("eventType", ["PageView", "ViewContent", "AddToCart", "Lead", "Purchase", "InitiateCheckout"]).notNull(),
  ruleConfig: json("ruleConfig").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Conversion = typeof conversions.$inferSelect;
export type InsertConversion = typeof conversions.$inferInsert;

export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["ticto", "hotmart", "kiwify", "eduzz", "monetizze", "shopify"]).notNull(),
  token: varchar("token", { length: 128 }).notNull(),
  urlGenerated: varchar("urlGenerated", { length: 512 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  webhookId: int("webhookId"),
  externalCode: varchar("externalCode", { length: 128 }).notNull(),
  customerName: varchar("customerName", { length: 255 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["credit_card", "boleto", "pix", "other"]).default("other").notNull(),
  status: mysqlEnum("status", ["approved", "pending", "chargeback", "refunded"]).default("pending").notNull(),
  tracked: boolean("tracked").default(false).notNull(),
  productName: varchar("productName", { length: 255 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmContent: varchar("utmContent", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  fbclid: varchar("fbclid", { length: 512 }),
  transactionAt: timestamp("transactionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

export const pixelEvents = mysqlTable("pixelEvents", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  pixelId: int("pixelId"),
  eventId: varchar("eventId", { length: 128 }).notNull(),
  eventName: mysqlEnum("eventName", ["PageView", "ViewContent", "AddToCart", "Lead", "Purchase", "InitiateCheckout"]).notNull(),
  eventTime: timestamp("eventTime").defaultNow().notNull(),
  pageUrl: varchar("pageUrl", { length: 1024 }),
  contentName: varchar("contentName", { length: 255 }),
  userEmailHash: varchar("userEmailHash", { length: 128 }),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  metaResponse: json("metaResponse").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PixelEvent = typeof pixelEvents.$inferSelect;
export type InsertPixelEvent = typeof pixelEvents.$inferInsert;

export const campaignsCache = mysqlTable("campaignsCache", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE").notNull(),
  dailyBudget: decimal("dailyBudget", { precision: 12, scale: 2 }),
  lifetimeBudget: decimal("lifetimeBudget", { precision: 12, scale: 2 }),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0.00").notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export type CampaignCache = typeof campaignsCache.$inferSelect;
export type InsertCampaignCache = typeof campaignsCache.$inferInsert;

export const adsetsCache = mysqlTable("adsetsCache", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  adAccountId: int("adAccountId").notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE").notNull(),
  dailyBudget: decimal("dailyBudget", { precision: 12, scale: 2 }),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0.00").notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export type AdsetCache = typeof adsetsCache.$inferSelect;
export type InsertAdsetCache = typeof adsetsCache.$inferInsert;

export const adsCache = mysqlTable("adsCache", {
  id: int("id").autoincrement().primaryKey(),
  adsetId: int("adsetId").notNull(),
  adAccountId: int("adAccountId").notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE").notNull(),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0.00").notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export type AdCache = typeof adsCache.$inferSelect;
export type InsertAdCache = typeof adsCache.$inferInsert;

export const taxes = mysqlTable("taxes", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  ruleType: mysqlEnum("ruleType", ["percentage", "fixed"]).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Tax = typeof taxes.$inferSelect;
export type InsertTax = typeof taxes.$inferInsert;

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const preCheckoutForms = mysqlTable("preCheckoutForms", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  runOn: mysqlEnum("runOn", ["all_site", "specific_url"]).default("all_site").notNull(),
  targetUrl: varchar("targetUrl", { length: 1024 }),
  windowTitle: varchar("windowTitle", { length: 255 }).notNull(),
  secondaryText: text("secondaryText"),
  redirectUrl: varchar("redirectUrl", { length: 1024 }),
  askPhone: boolean("askPhone").default(false).notNull(),
  layoutConfig: json("layoutConfig").$type<Record<string, any>>().default({}).notNull(),
  fieldConfig: json("fieldConfig").$type<Record<string, any>>().default({}).notNull(),
  codeGenerated: text("codeGenerated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PreCheckoutForm = typeof preCheckoutForms.$inferSelect;
export type InsertPreCheckoutForm = typeof preCheckoutForms.$inferInsert;

export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  profileId: int("profileId"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  lastAccess: timestamp("lastAccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  permissions: json("permissions").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export const onlineVisitors = mysqlTable("onlineVisitors", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  pageUrl: varchar("pageUrl", { length: 1024 }).notNull(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});
export type OnlineVisitor = typeof onlineVisitors.$inferSelect;
export type InsertOnlineVisitor = typeof onlineVisitors.$inferInsert;

export const metaApiLogs = mysqlTable("metaApiLogs", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId"),
  operation: varchar("operation", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["success", "error"]).notNull(),
  requestPayload: json("requestPayload").$type<Record<string, any>>().default({}).notNull(),
  responsePayload: json("responsePayload").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MetaApiLog = typeof metaApiLogs.$inferSelect;
export type InsertMetaApiLog = typeof metaApiLogs.$inferInsert;

export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId"),
  platform: varchar("platform", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "failed"]).default("received").notNull(),
  payload: json("payload").$type<Record<string, any>>().default({}).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  adAccountId: int("adAccountId").notNull(),
  formId: int("formId"),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  pageUrl: varchar("pageUrl", { length: 1024 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmContent: varchar("utmContent", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  fbclid: varchar("fbclid", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export const adTrackerSettings = mysqlTable("adTrackerSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activeAdAccountId: int("activeAdAccountId"),
  metaAppId: varchar("metaAppId", { length: 255 }),
  metaAppSecretEncrypted: text("metaAppSecretEncrypted"),
  frontendBaseUrl: varchar("frontendBaseUrl", { length: 512 }),
  backendBaseUrl: varchar("backendBaseUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdTrackerSettings = typeof adTrackerSettings.$inferSelect;
export type InsertAdTrackerSettings = typeof adTrackerSettings.$inferInsert;

export const refreshTokens = mysqlTable("refreshTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

export const adTrackerMigrationState = mysqlTable("adTrackerMigrationState", {
  id: int("id").autoincrement().primaryKey(),
  version: varchar("version", { length: 64 }).notNull(),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
});
export type AdTrackerMigrationState = typeof adTrackerMigrationState.$inferSelect;
export type InsertAdTrackerMigrationState = typeof adTrackerMigrationState.$inferInsert;
