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

    console.log("[migrate] Migration completed successfully.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
