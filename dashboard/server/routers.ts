import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getRecentPosts,
  getMetricsSummary,
  getPipelineConfig,
  getExecutionLogs,
  getIntegrationStatus,
  getCacheItems,
  getMetricsSnapshot,
} from "./db";
import { registerUser, loginUser, getPendingUsers, authorizeUser, rejectUser } from "./auth";
import type { User } from "../drizzle/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

/**
 * Serialize a User record for safe transmission to the frontend.
 * - Converts Date fields to ISO strings so JSON serialization is always valid.
 * - Strips sensitive fields (passwordHash, openId) that must never leave the server.
 */
export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loginMethod: user.loginMethod,
    isAuthorized: user.isAuthorized,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
    lastSignedIn: user.lastSignedIn instanceof Date ? user.lastSignedIn.toISOString() : (user.lastSignedIn ?? null),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? serializeUser(opts.ctx.user) : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string() }))
      .mutation(async ({ input }) => {
        const user = await registerUser(input.email, input.password, input.name);
        return { success: true, user };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await loginUser(input.email, input.password);
        const sessionToken = await sdk.createSessionToken(
          `email:${user.email}`,
          { name: user.name ?? "" }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { success: true, user };
      }),
  }),

  admin: router({
    // User management
    getPendingUsers: protectedProcedure.query(async () => {
      return await getPendingUsers();
    }),
    authorizeUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await authorizeUser(input.userId);
        return { success: true };
      }),
    rejectUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await rejectUser(input.userId);
        return { success: true };
      }),
    getAllUsers: protectedProcedure.query(async () => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) throw new Error('Database not available');
      const { users } = await import('../drizzle/schema');
      return await db.select().from(users);
    }),
    
    // Content approval
    getPendingApprovals: protectedProcedure.query(async () => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) throw new Error('Database not available');
      const { contentApprovals } = await import('../drizzle/schema');
      return await db.select().from(contentApprovals).where(eq(contentApprovals.status, 'pending'));
    }),
    approveContentChannel: protectedProcedure
      .input(z.object({ approvalId: z.number(), channel: z.enum(['telegram', 'instagram']) }))
      .mutation(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        const { contentApprovals } = await import('../drizzle/schema');
        
        const updateData = input.channel === 'telegram' 
          ? { telegramApproved: true }
          : { instagramApproved: true };
        
        await db.update(contentApprovals)
          .set(updateData)
          .where(eq(contentApprovals.id, input.approvalId));
        
        return { success: true };
      }),
    rejectContent: protectedProcedure
      .input(z.object({ approvalId: z.number(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        const { contentApprovals } = await import('../drizzle/schema');
        await db.update(contentApprovals)
          .set({ status: 'rejected', rejectionReason: input.reason, approvedAt: new Date(), approvedBy: ctx.user?.id })
          .where(eq(contentApprovals.id, input.approvalId));
        return { success: true };
      }),
    
    // Integration settings
    getIntegrationSettings: protectedProcedure
      .input(z.object({ integrationName: z.string() }))
      .query(async ({ input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        const { integrationSettings } = await import('../drizzle/schema');
        const result = await db.select().from(integrationSettings).where(eq(integrationSettings.integrationName, input.integrationName));
        return result[0] || null;
      }),
    updateIntegrationSettings: protectedProcedure
      .input(z.object({
        integrationName: z.string(),
        settings: z.record(z.string(), z.string().nullable().optional())
      }))
      .mutation(async ({ input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        const { integrationSettings } = await import('../drizzle/schema');
        const existing = await db.select().from(integrationSettings).where(eq(integrationSettings.integrationName, input.integrationName));
        
        if (existing.length > 0) {
          await db.update(integrationSettings)
            .set(input.settings)
            .where(eq(integrationSettings.integrationName, input.integrationName));
        } else {
          await db.insert(integrationSettings).values({
            integrationName: input.integrationName,
            ...input.settings
          });
        }
        return { success: true };
      }),
  }),

  dashboard: router({
    // Migration endpoint to create integrationSettings table
    runMigration: protectedProcedure.mutation(async () => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) throw new Error('Database not available');
      
      try {
        // Create integrationSettings table if it doesn't exist
        await db.execute(`
          CREATE TABLE IF NOT EXISTS integrationSettings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            integrationName VARCHAR(64) NOT NULL UNIQUE,
            metaAppId VARCHAR(255),
            metaAppSecret VARCHAR(255),
            metaPageAccessToken VARCHAR(255),
            metaPageId VARCHAR(255),
            metaInstagramAccountId VARCHAR(255),
            telegramBotToken VARCHAR(255),
            telegramChatId VARCHAR(255),
            shopeeApiKey VARCHAR(255),
            shopeePartnerId VARCHAR(255),
            gtmId VARCHAR(255),
            geminiApiKey VARCHAR(255),
            isActive BOOLEAN DEFAULT true NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
            INDEX idx_integrationName (integrationName)
          )
        `);
        // Add geminiApiKey column if it doesn't exist
        try {
          await db.execute(`
            ALTER TABLE integrationSettings ADD COLUMN geminiApiKey VARCHAR(255) AFTER gtmId
          `);
        } catch (e: any) {
          // Column might already exist, ignore the error
          if (!e.message?.includes('Duplicate column')) {
            throw e;
          }
        }
        
        return { success: true, message: 'Table initialized successfully' };
      } catch (error) {
        console.error('Migration error:', error);
        return { success: false, message: String(error) };
      }
    }),
    getMetricsSummary: publicProcedure.query(async () => {
      return await getMetricsSummary();
    }),

    getRecentPosts: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return await getRecentPosts(input.limit);
      }),

    getPipelineConfig: publicProcedure.query(async () => {
      return await getPipelineConfig();
    }),

    getExecutionLogs: publicProcedure.query(async () => {
      return await getExecutionLogs();
    }),

    getIntegrationStatus: publicProcedure.query(async () => {
      return await getIntegrationStatus();
    }),

    getCacheItems: publicProcedure.query(async () => {
      return await getCacheItems();
    }),

    getMetricsSnapshot: publicProcedure.query(async () => {
      return await getMetricsSnapshot();
    }),
  }),
});

export type AppRouter = typeof appRouter;
