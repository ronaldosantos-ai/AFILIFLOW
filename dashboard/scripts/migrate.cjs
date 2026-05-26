#!/usr/bin/env node
/**
 * Idempotent database migration script.
 *
 * Creates the `users` table if it doesn't exist, then conditionally adds any
 * columns that may be missing from an older schema version.  Safe to run on
 * every deployment.
 *
 * Usage:
 *   node scripts/migrate.cjs
 *
 * Requires the DATABASE_URL environment variable to be set.
 */

"use strict";

const mysql = require("mysql2/promise");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[migrate] ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

async function run() {
  console.log("[migrate] Connecting to database…");

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // ------------------------------------------------------------------
    // 1. Create the users table (full schema) if it doesn't exist yet.
    // ------------------------------------------------------------------
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\`           INT            NOT NULL AUTO_INCREMENT,
        \`openId\`       VARCHAR(64)    NULL,
        \`email\`        VARCHAR(320)   NULL,
        \`passwordHash\` VARCHAR(255)   NULL,
        \`name\`         TEXT           NULL,
        \`loginMethod\`  VARCHAR(64)    NULL,
        \`role\`         ENUM('user','admin') NOT NULL DEFAULT 'user',
        \`isAuthorized\` TINYINT(1)     NOT NULL DEFAULT 0,
        \`createdAt\`    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\`    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` TIMESTAMP      NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`users_openId_unique\` (\`openId\`),
        UNIQUE KEY \`users_email_unique\`  (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("[migrate] ✓ users table exists (created or already present).");

    // ------------------------------------------------------------------
    // 2. Fetch the current column list so we can apply ALTER statements
    //    only for columns that are genuinely missing.
    // ------------------------------------------------------------------
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const existingColumns = new Set(rows.map((r) => r.COLUMN_NAME));

    /** Run an ALTER TABLE only when the column is absent. */
    async function addColumnIfMissing(columnName, ddl) {
      if (existingColumns.has(columnName)) {
        console.log(`[migrate] ✓ Column '${columnName}' already exists — skipping.`);
        return;
      }
      await connection.execute(`ALTER TABLE \`users\` ADD COLUMN ${ddl}`);
      console.log(`[migrate] ✓ Added missing column '${columnName}'.`);
    }

    await addColumnIfMissing("openId",       "`openId`       VARCHAR(64)  NULL,  ADD UNIQUE KEY `users_openId_unique` (`openId`)");
    await addColumnIfMissing("email",        "`email`        VARCHAR(320) NULL,  ADD UNIQUE KEY `users_email_unique`  (`email`)");
    await addColumnIfMissing("passwordHash", "`passwordHash` VARCHAR(255) NULL");
    await addColumnIfMissing("name",         "`name`         TEXT         NULL");
    await addColumnIfMissing("loginMethod",  "`loginMethod`  VARCHAR(64)  NULL");
    await addColumnIfMissing("role",         "`role`         ENUM('user','admin') NOT NULL DEFAULT 'user'");
    await addColumnIfMissing("isAuthorized", "`isAuthorized` TINYINT(1)   NOT NULL DEFAULT 0");
    await addColumnIfMissing("createdAt",    "`createdAt`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP");
    await addColumnIfMissing("updatedAt",    "`updatedAt`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    await addColumnIfMissing("lastSignedIn", "`lastSignedIn` TIMESTAMP    NULL");

// ------------------------------------------------------------------
// 3. Create integrationSettings table if it doesn't exist
// ------------------------------------------------------------------
await connection.execute(`
  CREATE TABLE IF NOT EXISTS \`integrationSettings\` (
    \`id\`                     INT          NOT NULL AUTO_INCREMENT,
    \`integrationName\`        VARCHAR(64)  NOT NULL,
    \`metaAppId\`              VARCHAR(255) NULL,
    \`metaAppSecret\`          VARCHAR(255) NULL,
    \`metaPageAccessToken\`    VARCHAR(255) NULL,
    \`metaPageId\`             VARCHAR(255) NULL,
    \`metaInstagramAccountId\` VARCHAR(255) NULL,
    \`telegramBotToken\`       VARCHAR(255) NULL,
    \`telegramChatId\`         VARCHAR(255) NULL,
    \`shopeeApiKey\`           VARCHAR(255) NULL,
    \`shopeePartnerId\`        VARCHAR(255) NULL,
    \`gtmId\`                  VARCHAR(255) NULL,
    \`isActive\`               TINYINT(1)   NOT NULL DEFAULT 1,
    \`createdAt\`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`integrationSettings_name_unique\` (\`integrationName\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
console.log("[migrate] ✔ integrationSettings table exists (created or already present).");

// Adiciona coluna geminiApiKey se não existir
try {
  await connection.execute(`ALTER TABLE \`integrationSettings\` ADD COLUMN \`geminiApiKey\` VARCHAR(255) AFTER \`gtmId\``);
  console.log("[migrate] ✔ Added geminiApiKey column.");
} catch (e) {
  if (!e.message.includes('Duplicate column')) console.warn("[migrate] geminiApiKey:", e.message);
}

// Cria tabela contentApprovals
await connection.execute(`CREATE TABLE IF NOT EXISTS \`contentApprovals\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`postId\` INT NOT NULL,
  \`productName\` TEXT NOT NULL,
  \`productImage\` VARCHAR(512) NULL,
  \`description\` TEXT NULL,
  \`affiliateUrl\` VARCHAR(512) NOT NULL,
  \`proposedChannels\` JSON NOT NULL DEFAULT ('[]'),
  \`telegramApproved\` TINYINT(1) NOT NULL DEFAULT 0,
  \`instagramApproved\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('pending','approved','rejected','partially_approved') NOT NULL DEFAULT 'pending',
  \`rejectionReason\` TEXT NULL,
  \`editHistory\` JSON NOT NULL DEFAULT ('[]'),
  \`currentVersion\` INT NOT NULL DEFAULT 1,
  \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`approvedAt\` TIMESTAMP NULL,
  \`approvedBy\` INT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
console.log("[migrate] ✔ contentApprovals table ready.");

// Cria tabela auditLogs
await connection.execute(`CREATE TABLE IF NOT EXISTS \`auditLogs\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`userId\` INT NOT NULL,
  \`action\` VARCHAR(64) NOT NULL,
  \`targetType\` VARCHAR(32) NOT NULL,
  \`targetId\` INT NULL,
  \`description\` TEXT NULL,
  \`details\` JSON NOT NULL DEFAULT ('{}'),
  \`ipAddress\` VARCHAR(45) NULL,
  \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
console.log("[migrate] ✔ auditLogs table ready.");

// Cria tabela manualPosts
await connection.execute(`CREATE TABLE IF NOT EXISTS \`manualPosts\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`userId\` INT NOT NULL,
  \`productUrl\` VARCHAR(512) NOT NULL,
  \`productName\` TEXT NOT NULL,
  \`productPrice\` DECIMAL(10,2) NULL,
  \`productImage\` VARCHAR(512) NULL,
  \`productDescription\` TEXT NULL,
  \`affiliateUrl\` VARCHAR(512) NULL,
  \`aidaDescription\` TEXT NULL,
  \`generatedImage\` VARCHAR(512) NULL,
  \`editedDescription\` TEXT NULL,
  \`publishChannels\` JSON NOT NULL DEFAULT ('[]'),
  \`status\` ENUM('draft','pending','approved','rejected','published') NOT NULL DEFAULT 'draft',
  \`rejectionReason\` TEXT NULL,
  \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
console.log("[migrate] ✔ manualPosts table ready.");

    // ------------------------------------------------------------------
    // 4. AdTracker core tables (idempotent)
    // ------------------------------------------------------------------
    const adTrackerTables = [
      [`adAccounts`, `
        CREATE TABLE IF NOT EXISTS \`adAccounts\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`userId\` INT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`platform\` ENUM('meta','google','tiktok','pinterest') NOT NULL DEFAULT 'meta',
          \`externalId\` VARCHAR(128) NOT NULL,
          \`accessTokenEncrypted\` TEXT NULL,
          \`refreshTokenEncrypted\` TEXT NULL,
          \`currency\` VARCHAR(12) NOT NULL DEFAULT 'BRL',
          \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
          \`lastSyncAt\` TIMESTAMP NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`pixels`, `
        CREATE TABLE IF NOT EXISTS \`pixels\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`identifier\` VARCHAR(255) NOT NULL,
          \`pixelId\` VARCHAR(128) NOT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`conversions`, `
        CREATE TABLE IF NOT EXISTS \`conversions\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`pixelId\` INT NULL,
          \`identifier\` VARCHAR(255) NOT NULL,
          \`triggerType\` ENUM('page_access','element_view','click') NOT NULL,
          \`eventType\` ENUM('PageView','ViewContent','AddToCart','Lead','Purchase','InitiateCheckout') NOT NULL,
          \`ruleConfig\` JSON NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`webhooks`, `
        CREATE TABLE IF NOT EXISTS \`webhooks\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`identifier\` VARCHAR(255) NOT NULL,
          \`platform\` ENUM('ticto','hotmart','kiwify','eduzz','monetizze','shopify') NOT NULL,
          \`token\` VARCHAR(128) NOT NULL,
          \`urlGenerated\` VARCHAR(512) NOT NULL,
          \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`sales`, `
        CREATE TABLE IF NOT EXISTS \`sales\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`webhookId\` INT NULL,
          \`externalCode\` VARCHAR(128) NOT NULL,
          \`customerName\` VARCHAR(255) NULL,
          \`customerEmail\` VARCHAR(320) NULL,
          \`amount\` DECIMAL(12,2) NOT NULL,
          \`paymentMethod\` ENUM('credit_card','boleto','pix','other') NOT NULL DEFAULT 'other',
          \`status\` ENUM('approved','pending','chargeback','refunded') NOT NULL DEFAULT 'pending',
          \`tracked\` TINYINT(1) NOT NULL DEFAULT 0,
          \`productName\` VARCHAR(255) NULL,
          \`utmSource\` VARCHAR(255) NULL,
          \`utmMedium\` VARCHAR(255) NULL,
          \`utmCampaign\` VARCHAR(255) NULL,
          \`utmContent\` VARCHAR(255) NULL,
          \`utmTerm\` VARCHAR(255) NULL,
          \`fbclid\` VARCHAR(512) NULL,
          \`transactionAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`pixelEvents`, `
        CREATE TABLE IF NOT EXISTS \`pixelEvents\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`pixelId\` INT NULL,
          \`eventId\` VARCHAR(128) NOT NULL,
          \`eventName\` ENUM('PageView','ViewContent','AddToCart','Lead','Purchase','InitiateCheckout') NOT NULL,
          \`eventTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`pageUrl\` VARCHAR(1024) NULL,
          \`contentName\` VARCHAR(255) NULL,
          \`userEmailHash\` VARCHAR(128) NULL,
          \`status\` ENUM('sent','failed','pending') NOT NULL DEFAULT 'pending',
          \`metaResponse\` JSON NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`campaignsCache`, `
        CREATE TABLE IF NOT EXISTS \`campaignsCache\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adAccountId\` INT NOT NULL,
          \`externalId\` VARCHAR(128) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` ENUM('ACTIVE','PAUSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
          \`dailyBudget\` DECIMAL(12,2) NULL,
          \`lifetimeBudget\` DECIMAL(12,2) NULL,
          \`spend\` DECIMAL(12,2) NOT NULL DEFAULT 0,
          \`impressions\` INT NOT NULL DEFAULT 0,
          \`clicks\` INT NOT NULL DEFAULT 0,
          \`syncedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`adsetsCache`, `
        CREATE TABLE IF NOT EXISTS \`adsetsCache\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`campaignId\` INT NOT NULL,
          \`adAccountId\` INT NOT NULL,
          \`externalId\` VARCHAR(128) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` ENUM('ACTIVE','PAUSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
          \`dailyBudget\` DECIMAL(12,2) NULL,
          \`spend\` DECIMAL(12,2) NOT NULL DEFAULT 0,
          \`impressions\` INT NOT NULL DEFAULT 0,
          \`clicks\` INT NOT NULL DEFAULT 0,
          \`syncedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`adsCache`, `
        CREATE TABLE IF NOT EXISTS \`adsCache\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`adsetId\` INT NOT NULL,
          \`adAccountId\` INT NOT NULL,
          \`externalId\` VARCHAR(128) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`status\` ENUM('ACTIVE','PAUSED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
          \`spend\` DECIMAL(12,2) NOT NULL DEFAULT 0,
          \`impressions\` INT NOT NULL DEFAULT 0,
          \`clicks\` INT NOT NULL DEFAULT 0,
          \`syncedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`taxes`, `CREATE TABLE IF NOT EXISTS \`taxes\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NOT NULL, \`identifier\` VARCHAR(255) NOT NULL, \`ruleType\` ENUM('percentage','fixed') NOT NULL, \`value\` DECIMAL(12,2) NOT NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`products`, `CREATE TABLE IF NOT EXISTS \`products\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NOT NULL, \`name\` VARCHAR(255) NOT NULL, \`cost\` DECIMAL(12,2) NOT NULL DEFAULT 0, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`preCheckoutForms`, `CREATE TABLE IF NOT EXISTS \`preCheckoutForms\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NOT NULL, \`identifier\` VARCHAR(255) NOT NULL, \`runOn\` ENUM('all_site','specific_url') NOT NULL DEFAULT 'all_site', \`targetUrl\` VARCHAR(1024) NULL, \`windowTitle\` VARCHAR(255) NOT NULL, \`secondaryText\` TEXT NULL, \`redirectUrl\` VARCHAR(1024) NULL, \`askPhone\` TINYINT(1) NOT NULL DEFAULT 0, \`layoutConfig\` JSON NULL, \`fieldConfig\` JSON NULL, \`codeGenerated\` TEXT NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`collaborators`, `CREATE TABLE IF NOT EXISTS \`collaborators\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`userId\` INT NOT NULL, \`name\` VARCHAR(255) NOT NULL, \`email\` VARCHAR(320) NOT NULL, \`profileId\` INT NULL, \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active', \`lastAccess\` TIMESTAMP NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`profiles`, `CREATE TABLE IF NOT EXISTS \`profiles\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`userId\` INT NOT NULL, \`name\` VARCHAR(255) NOT NULL, \`permissions\` JSON NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`onlineVisitors`, `CREATE TABLE IF NOT EXISTS \`onlineVisitors\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NOT NULL, \`pageUrl\` VARCHAR(1024) NOT NULL, \`sessionId\` VARCHAR(128) NOT NULL, \`lastSeenAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`metaApiLogs`, `CREATE TABLE IF NOT EXISTS \`metaApiLogs\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NULL, \`operation\` VARCHAR(128) NOT NULL, \`status\` ENUM('success','error') NOT NULL, \`requestPayload\` JSON NULL, \`responsePayload\` JSON NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`webhookLogs`, `CREATE TABLE IF NOT EXISTS \`webhookLogs\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NULL, \`platform\` VARCHAR(64) NOT NULL, \`status\` ENUM('received','processed','failed') NOT NULL DEFAULT 'received', \`payload\` JSON NULL, \`errorMessage\` TEXT NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`leads`, `CREATE TABLE IF NOT EXISTS \`leads\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`adAccountId\` INT NOT NULL, \`formId\` INT NULL, \`name\` VARCHAR(255) NULL, \`email\` VARCHAR(320) NULL, \`phone\` VARCHAR(64) NULL, \`pageUrl\` VARCHAR(1024) NULL, \`utmSource\` VARCHAR(255) NULL, \`utmMedium\` VARCHAR(255) NULL, \`utmCampaign\` VARCHAR(255) NULL, \`utmContent\` VARCHAR(255) NULL, \`utmTerm\` VARCHAR(255) NULL, \`fbclid\` VARCHAR(512) NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`adTrackerSettings`, `CREATE TABLE IF NOT EXISTS \`adTrackerSettings\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`userId\` INT NOT NULL, \`activeAdAccountId\` INT NULL, \`metaAppId\` VARCHAR(255) NULL, \`metaAppSecretEncrypted\` TEXT NULL, \`frontendBaseUrl\` VARCHAR(512) NULL, \`backendBaseUrl\` VARCHAR(512) NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`refreshTokens`, `CREATE TABLE IF NOT EXISTS \`refreshTokens\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`userId\` INT NOT NULL, \`tokenHash\` VARCHAR(255) NOT NULL, \`expiresAt\` TIMESTAMP NOT NULL, \`revokedAt\` TIMESTAMP NULL, \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
      [`adTrackerMigrationState`, `CREATE TABLE IF NOT EXISTS \`adTrackerMigrationState\` (\`id\` INT NOT NULL AUTO_INCREMENT, \`version\` VARCHAR(64) NOT NULL, \`appliedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],
    ];

    for (const [tableName, ddl] of adTrackerTables) {
      await connection.execute(ddl);
      console.log(`[migrate] ✔ ${tableName} table ready.`);
    }

    console.log("[migrate] Migration completed successfully.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
