import { eq, desc, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, posts, pipelineConfig, executionLogs, integrationStatus, cacheItems, metricsSnapshots, contentApprovals, integrationSettings, manualPosts, InsertManualPost, ManualPost, copyTracking, InsertCopyTracking } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Dashboard queries
export async function getRecentPosts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function getMetricsSummary() {
  const db = await getDb();
  if (!db) return null;

  const allPosts = await db.select().from(posts);
  const successPosts = allPosts.filter(p => p.status === "published");
  const failedPosts = allPosts.filter(p => p.status === "failed");

  return {
    totalPublished: allPosts.length,
    successCount: successPosts.length,
    failureCount: failedPosts.length,
    successRate: allPosts.length > 0 ? (successPosts.length / allPosts.length) * 100 : 0,
  };
}

export async function getPipelineConfig() {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(pipelineConfig).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePipelineConfig(config: Partial<typeof pipelineConfig.$inferInsert>) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db.select().from(pipelineConfig).limit(1);
  
  if (existing.length > 0) {
    await db.update(pipelineConfig).set(config).where(eq(pipelineConfig.id, existing[0].id));
  } else {
    await db.insert(pipelineConfig).values(config as any);
  }

  return await getPipelineConfig();
}

export async function getExecutionLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(executionLogs)
    .orderBy(desc(executionLogs.createdAt))
    .limit(limit);
}

export async function createExecutionLog(log: typeof executionLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(executionLogs).values(log);
  return log;
}

export async function getIntegrationStatus(integrationName?: string) {
  const db = await getDb();
  if (!db) return [];

  if (integrationName) {
    const result = await db
      .select()
      .from(integrationStatus)
      .where(eq(integrationStatus.integrationName, integrationName as any));
    return result;
  }

  return await db.select().from(integrationStatus);
}

export async function updateIntegrationStatus(integrationName: string, status: typeof integrationStatus.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(integrationStatus)
    .where(eq(integrationStatus.integrationName, integrationName as any));

  if (existing.length > 0) {
    await db
      .update(integrationStatus)
      .set(status)
      .where(eq(integrationStatus.integrationName, integrationName as any));
  } else {
    await db.insert(integrationStatus).values({ ...status, integrationName: integrationName as any });
  }

  return await getIntegrationStatus(integrationName);
}

export async function getCacheItems() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cacheItems).orderBy(desc(cacheItems.publishedAt));
}

export async function addCacheItem(item: typeof cacheItems.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(cacheItems).values(item);
  return item;
}

export async function removeCacheItem(productId: string) {
  const db = await getDb();
  if (!db) return false;

  await db.delete(cacheItems).where(eq(cacheItems.productId, productId));
  return true;
}

export async function isCached(productId: string) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(cacheItems)
    .where(eq(cacheItems.productId, productId))
    .limit(1);

  return result.length > 0;
}

export async function getMetricsSnapshot(limit: number = 30) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(metricsSnapshots)
    .orderBy(desc(metricsSnapshots.createdAt))
    .limit(limit);
}

export async function createMetricsSnapshot(snapshot: typeof metricsSnapshots.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(metricsSnapshots).values(snapshot);
  return snapshot;
}

// Manual Posts helpers
export async function createManualPost(post: InsertManualPost) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(manualPosts).values(post);
  return result;
}

export async function getManualPost(id: number): Promise<ManualPost | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(manualPosts).where(eq(manualPosts.id, id)).limit(1);
  return result[0] || null;
}

export async function getManualPostsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(manualPosts)
    .where(eq(manualPosts.userId, userId))
    .orderBy(desc(manualPosts.createdAt));
}

export async function updateManualPost(id: number, updates: Partial<ManualPost>) {
  const db = await getDb();
  if (!db) return null;

  await db.update(manualPosts).set(updates).where(eq(manualPosts.id, id));
  return await getManualPost(id);
}

export async function deleteManualPost(id: number) {
  const db = await getDb();
  if (!db) return false;

  await db.delete(manualPosts).where(eq(manualPosts.id, id));
  return true;
}


// ─────────────────────────────────────────────────────────
// Copy Tracking Helpers
// ─────────────────────────────────────────────────────────

export async function trackCopy(data: InsertCopyTracking) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(copyTracking).values(data);
    return result;
  } catch (error) {
    console.error("Error tracking copy:", error);
    return null;
  }
}

export async function getCopyHistory(contentApprovalId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const history = await db
      .select()
      .from(copyTracking)
      .where(eq(copyTracking.contentApprovalId, contentApprovalId))
      .orderBy(desc(copyTracking.copiedAt));
    return history;
  } catch (error) {
    console.error("Error getting copy history:", error);
    return [];
  }
}

export async function getCopyStats(contentApprovalId: number) {
  const db = await getDb();
  if (!db) return { totalCopies: 0, fields: {} };

  try {
    const history = await getCopyHistory(contentApprovalId);
    const stats = {
      totalCopies: history.length,
      fields: {} as Record<string, number>,
    };

    history.forEach((item) => {
      stats.fields[item.fieldName] = (stats.fields[item.fieldName] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error("Error getting copy stats:", error);
    return { totalCopies: 0, fields: {} };
  }
}
