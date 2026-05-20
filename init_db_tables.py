"""
init_db_tables.py

Inicializa as tabelas do banco de dados MySQL.
Usa variáveis de ambiente para conexão — nunca hardcode credenciais.
"""

import os
import logging
from urllib.parse import urlparse
import mysql.connector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_connection():
    """Obtém conexão com o banco usando variáveis de ambiente."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        return mysql.connector.connect(
            host=parsed.hostname,
            port=parsed.port or 3306,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/'),
            autocommit=True
        )

    host = os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST")
    port = int(os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT") or 3306)
    user = os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER") or "root"
    password = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD") or os.getenv("MYSQL_ROOT_PASSWORD")
    database = os.getenv("MYSQLDATABASE") or os.getenv("MYSQL_DATABASE") or "railway"

    if not host or not password:
        raise Exception("Nenhuma variável de banco de dados encontrada (DATABASE_URL, MYSQLHOST, etc.)")

    return mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        autocommit=True
    )


def init_db():
    """Cria todas as tabelas necessárias se não existirem."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        logger.info("🚀 Criando tabelas no banco de dados...")

        # ── posts (histórico de publicações) ──────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                productId VARCHAR(255) NOT NULL,
                productName TEXT NOT NULL,
                price DECIMAL(10, 2),
                imageUrl TEXT,
                affiliateUrl TEXT,
                category VARCHAR(100),
                status ENUM('published', 'failed', 'pending') DEFAULT 'published',
                channelsPublished JSON,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ── executionLogs ──────────────────────────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS executionLogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                executionId VARCHAR(255) UNIQUE,
                status ENUM('success', 'error', 'partial'),
                productFound VARCHAR(255),
                productName TEXT,
                channelsPublished JSON,
                errorMessage TEXT,
                executionTime INT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ── pipelineConfig (com campo paused para pausar/retomar) ──
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pipelineConfig (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduleTimes JSON,
                keywords JSON,
                maxPrice DECIMAL(10, 2),
                minRating DECIMAL(3, 2),
                activeCategories JSON,
                paused BOOLEAN DEFAULT FALSE,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        # Garante que o campo paused existe (migração para bancos já existentes)
        try:
            cursor.execute("""
                ALTER TABLE pipelineConfig
                ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE
            """)
        except Exception:
            pass  # Coluna já existe ou banco não suporta IF NOT EXISTS

        # ── cacheItems ─────────────────────────────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cacheItems (
                id INT AUTO_INCREMENT PRIMARY KEY,
                productId VARCHAR(255) UNIQUE,
                productName TEXT,
                imageUrl TEXT,
                affiliateUrl TEXT,
                category VARCHAR(100),
                publishedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ── integrationStatus ──────────────────────────────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS integrationStatus (
                id INT AUTO_INCREMENT PRIMARY KEY,
                integrationName VARCHAR(100) UNIQUE,
                status ENUM('healthy', 'warning', 'error'),
                responseTime FLOAT,
                errorMessage TEXT,
                lastCheckedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ── integrationSettings ────────────────────────────────
        cursor.execute("""
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
                geminiApiKey VARCHAR(255),
                gtmId VARCHAR(255),
                isActive BOOLEAN DEFAULT true NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
            )
        """)

        # ── contentApprovals (conteúdo gerado automaticamente aguardando revisão) ──
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contentApprovals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                productId VARCHAR(255) NOT NULL,
                productName TEXT NOT NULL,
                price DECIMAL(10, 2),
                imageUrl TEXT,
                affiliateUrl TEXT,
                category VARCHAR(100),
                generatedTitle TEXT,
                generatedDescription TEXT,
                generatedHashtags TEXT,
                customPrompt TEXT,
                status ENUM('pending', 'approved', 'discarded') DEFAULT 'pending',
                source ENUM('automatic', 'manual') DEFAULT 'automatic',
                approvedAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        # ── manualPosts (publicações manuais via link) ─────────
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manualPosts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                originalUrl TEXT NOT NULL,
                productId VARCHAR(255),
                productName TEXT,
                price DECIMAL(10, 2),
                imageUrl TEXT,
                affiliateUrl TEXT,
                category VARCHAR(100),
                generatedTitle TEXT,
                generatedDescription TEXT,
                generatedHashtags TEXT,
                status ENUM('draft', 'published') DEFAULT 'draft',
                publishedAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        logger.info("✅ Todas as tabelas foram criadas ou já existem.")
        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"❌ Erro ao inicializar banco de dados: {e}")
        raise


if __name__ == "__main__":
    init_db()
