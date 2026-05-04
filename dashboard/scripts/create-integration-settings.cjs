#!/usr/bin/env node
/**
 * Migration script: create the `integrationSettings` table.
 *
 * Stores API keys and configuration for third-party integrations:
 * Meta, Telegram, Shopee, and GTM.
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS, so it is safe to run
 * multiple times without side-effects.
 *
 * Usage:
 *   node scripts/create-integration-settings.cjs
 *
 * Requires the DATABASE_URL environment variable to be set.
 */

"use strict";

const mysql = require("mysql2/promise");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "[create-integration-settings] ERROR: DATABASE_URL environment variable is not set."
  );
  process.exit(1);
}

async function run() {
  console.log("[create-integration-settings] Connecting to database…");

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // ------------------------------------------------------------------
    // 1. Create the integrationSettings table if it doesn't exist yet.
    // ------------------------------------------------------------------
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`integrationSettings\` (
        \`id\`                     INT           NOT NULL AUTO_INCREMENT,
        \`integrationName\`        VARCHAR(64)   NOT NULL,
        \`metaAppId\`              VARCHAR(255)  NULL,
        \`metaAppSecret\`          VARCHAR(255)  NULL,
        \`metaPageAccessToken\`    VARCHAR(255)  NULL,
        \`metaPageId\`             VARCHAR(255)  NULL,
        \`metaInstagramAccountId\` VARCHAR(255)  NULL,
        \`telegramBotToken\`       VARCHAR(255)  NULL,
        \`telegramChatId\`         VARCHAR(255)  NULL,
        \`shopeeApiKey\`           VARCHAR(255)  NULL,
        \`shopeePartnerId\`        VARCHAR(255)  NULL,
        \`gtmId\`                  VARCHAR(255)  NULL,
        \`isActive\`               BOOLEAN       NOT NULL DEFAULT true,
        \`createdAt\`              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\`              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`integrationSettings_integrationName_unique\` (\`integrationName\`),
        INDEX \`integrationSettings_integrationName_idx\` (\`integrationName\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(
      "[create-integration-settings] ✓ integrationSettings table created (or already present)."
    );

    // ------------------------------------------------------------------
    // 2. Verify the table exists.
    // ------------------------------------------------------------------
    const [rows] = await connection.execute(
      "SHOW TABLES LIKE 'integrationSettings'"
    );

    if (rows.length === 0) {
      console.error(
        "[create-integration-settings] ERROR: Table 'integrationSettings' was not found after creation."
      );
      process.exit(1);
    }

    console.log(
      "[create-integration-settings] ✓ Verified: 'integrationSettings' table exists in the database."
    );
    console.log(
      "[create-integration-settings] Migration completed successfully."
    );
  } catch (err) {
    console.error("[create-integration-settings] ERROR: Migration failed:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
