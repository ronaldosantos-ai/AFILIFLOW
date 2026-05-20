"""
python_db_integration.py
Integração do bot Python com o banco de dados MySQL (Drizzle).
Substitui o uso de arquivos JSON locais por persistência relacional.
"""

import os
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
import mysql.connector
from mysql.connector import Error

logger = logging.getLogger(__name__)

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Conecta ao banco de dados MySQL."""
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                logger.warning("⚠️  DATABASE_URL não configurada. Usando modo offline.")
                return False
            
            # Parse DATABASE_URL: mysql://user:password@host:port/database
            from urllib.parse import urlparse
            parsed = urlparse(database_url)
            
            self.connection = mysql.connector.connect(
                host=parsed.hostname,
                port=parsed.port or 3306,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path.lstrip('/'),
                autocommit=True
            )
            self.cursor = self.connection.cursor(dictionary=True)
            logger.info("✅ Conectado ao banco de dados MySQL.")
            return True
        except Error as e:
            logger.error(f"❌ Erro ao conectar ao banco de dados: {e}")
            return False
    
    def close(self):
        """Fecha a conexão com o banco de dados."""
        if self.connection and self.connection.is_connected():
            self.cursor.close()
            self.connection.close()
            logger.info("✅ Conexão com banco de dados fechada.")
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def get_pipeline_config() -> Optional[Dict[str, Any]]:
    """Obtém a configuração do pipeline do banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Usando config do .env")
                return None
            
            db.cursor.execute("SELECT * FROM pipelineConfig LIMIT 1")
            result = db.cursor.fetchone()
            
            if result:
                logger.info("✅ Configuração do pipeline carregada do banco de dados.")
                return result
            else:
                logger.warning("⚠️  Nenhuma configuração encontrada no banco de dados.")
                return None
    except Exception as e:
        logger.error(f"❌ Erro ao buscar configuração: {e}")
        return None


def update_pipeline_config(config: Dict[str, Any]) -> bool:
    """Atualiza a configuração do pipeline no banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Config não será salva.")
                return False
            
            # Verifica se já existe configuração
            db.cursor.execute("SELECT id FROM pipelineConfig LIMIT 1")
            existing = db.cursor.fetchone()
            
            if existing:
                # Atualiza
                update_fields = []
                values = []
                for key, value in config.items():
                    update_fields.append(f"{key} = %s")
                    values.append(value)
                
                values.append(existing['id'])
                query = f"UPDATE pipelineConfig SET {', '.join(update_fields)} WHERE id = %s"
                db.cursor.execute(query, values)
            else:
                # Insere
                columns = ', '.join(config.keys())
                placeholders = ', '.join(['%s'] * len(config))
                query = f"INSERT INTO pipelineConfig ({columns}) VALUES ({placeholders})"
                db.cursor.execute(query, list(config.values()))
            
            logger.info("✅ Configuração do pipeline atualizada no banco de dados.")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar configuração: {e}")
        return False


def create_execution_log(execution_data: Dict[str, Any]) -> bool:
    """Cria um registro de execução no banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Log não será salvo.")
                return False
            
            execution_data['createdAt'] = datetime.now().isoformat()
            
            columns = ', '.join(execution_data.keys())
            placeholders = ', '.join(['%s'] * len(execution_data))
            query = f"INSERT INTO executionLogs ({columns}) VALUES ({placeholders})"
            db.cursor.execute(query, list(execution_data.values()))
            
            logger.info(f"✅ Log de execução criado: {execution_data.get('executionId')}")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao criar log de execução: {e}")
        return False


def create_post_record(post_data: Dict[str, Any]) -> bool:
    """Cria um registro de postagem no banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Post não será registrado.")
                return False
            
            post_data['createdAt'] = datetime.now().isoformat()
            post_data['status'] = post_data.get('status', 'published')
            
            columns = ', '.join(post_data.keys())
            placeholders = ', '.join(['%s'] * len(post_data))
            query = f"INSERT INTO posts ({columns}) VALUES ({placeholders})"
            db.cursor.execute(query, list(post_data.values()))
            
            logger.info(f"✅ Post registrado: {post_data.get('productName')}")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao registrar post: {e}")
        return False


def add_cache_item(product_id: str, product_name: str, image_url: str, 
                   affiliate_url: str, category: str) -> bool:
    """Adiciona um item ao cache de produtos publicados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Cache não será atualizado.")
                return False
            
            cache_data = {
                'productId': product_id,
                'productName': product_name,
                'imageUrl': image_url,
                'affiliateUrl': affiliate_url,
                'category': category,
                'publishedAt': datetime.now().isoformat()
            }
            
            columns = ', '.join(cache_data.keys())
            placeholders = ', '.join(['%s'] * len(cache_data))
            query = f"INSERT INTO cacheItems ({columns}) VALUES ({placeholders})"
            db.cursor.execute(query, list(cache_data.values()))
            
            logger.info(f"✅ Item adicionado ao cache: {product_id}")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao adicionar item ao cache: {e}")
        return False


def is_product_cached(product_id: str, cache_expiry_days: int = 30) -> bool:
    """Verifica se um produto já foi publicado recentemente."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Verificação de cache offline.")
                return False
            
            query = """
            SELECT productId FROM cacheItems 
            WHERE productId = %s 
            AND publishedAt > DATE_SUB(NOW(), INTERVAL %s DAY)
            LIMIT 1
            """
            db.cursor.execute(query, (product_id, cache_expiry_days))
            result = db.cursor.fetchone()
            
            return result is not None
    except Exception as e:
        logger.error(f"❌ Erro ao verificar cache: {e}")
        return False


def update_integration_status(integration_name: str, status: str, 
                             response_time: Optional[float] = None,
                             error_message: Optional[str] = None) -> bool:
    """Atualiza o status de uma integração."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Status não será atualizado.")
                return False
            
            # Verifica se já existe
            db.cursor.execute(
                "SELECT id FROM integrationStatus WHERE integrationName = %s",
                (integration_name,)
            )
            existing = db.cursor.fetchone()
            
            status_data = {
                'status': status,
                'lastCheckedAt': datetime.now().isoformat()
            }
            
            if response_time:
                status_data['responseTime'] = response_time
            if error_message:
                status_data['errorMessage'] = error_message
            
            if existing:
                # Atualiza
                update_fields = []
                values = []
                for key, value in status_data.items():
                    update_fields.append(f"{key} = %s")
                    values.append(value)
                
                values.append(existing['id'])
                query = f"UPDATE integrationStatus SET {', '.join(update_fields)} WHERE id = %s"
                db.cursor.execute(query, values)
            else:
                # Insere
                status_data['integrationName'] = integration_name
                columns = ', '.join(status_data.keys())
                placeholders = ', '.join(['%s'] * len(status_data))
                query = f"INSERT INTO integrationStatus ({columns}) VALUES ({placeholders})"
                db.cursor.execute(query, list(status_data.values()))
            
            logger.info(f"✅ Status da integração '{integration_name}' atualizado: {status}")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar status da integração: {e}")
        return False


def get_recent_posts(limit: int = 10) -> List[Dict[str, Any]]:
    """Obtém os posts recentes do banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Nenhum post será retornado.")
                return []
            
            query = "SELECT * FROM posts ORDER BY createdAt DESC LIMIT %s"
            db.cursor.execute(query, (limit,))
            results = db.cursor.fetchall()
            
            logger.info(f"✅ {len(results)} posts recentes carregados.")
            return results
    except Exception as e:
        logger.error(f"❌ Erro ao buscar posts recentes: {e}")
        return []


# ─────────────────────────────────────────────────────────
#  FASE 1: PIPELINE E SCHEDULER
# ─────────────────────────────────────────────────────────

def is_pipeline_paused() -> bool:
    """Verifica se o pipeline está pausado."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Assumindo pipeline ativo.")
                return False
            
            query = "SELECT paused FROM pipelineConfig LIMIT 1"
            db.cursor.execute(query)
            result = db.cursor.fetchone()
            
            if result:
                return bool(result.get('paused', False))
            return False
    except Exception as e:
        logger.error(f"❌ Erro ao verificar status do pipeline: {e}")
        return False

def get_schedule_times() -> List[str]:
    """Obtém os horários agendados do banco de dados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível. Usando horários padrão.")
                return ["09:00", "14:00", "18:00"]
            
            query = "SELECT scheduleTimes FROM pipelineConfig LIMIT 1"
            db.cursor.execute(query)
            result = db.cursor.fetchone()
            
            if result and result.get('scheduleTimes'):
                import json
                times = json.loads(result['scheduleTimes'])
                logger.info(f"✅ Horários carregados do banco: {times}")
                return times
            
            logger.warning("⚠️  Nenhum horário configurado no banco.")
            return []
    except Exception as e:
        logger.error(f"❌ Erro ao carregar horários: {e}")
        return []

def create_content_approval(
    product_id: str,
    product_name: str,
    product_price: float,
    product_image: str,
    product_description: str,
    affiliate_url: str,
    title: str,
    description: str,
    hashtags: str,
    image_url: str,
    source: str = 'automatic',
    prompt: str = None
) -> Optional[int]:
    """Cria um novo conteúdo para aprovação."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return None
            
            query = """
            INSERT INTO contentApprovals (
                productId, productName, productPrice, productImage, productDescription,
                affiliateUrl, title, description, hashtags, imageUrl, prompt, source, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
            """
            
            values = (
                product_id, product_name, product_price, product_image, product_description,
                affiliate_url, title, description, hashtags, image_url, prompt, source
            )
            
            db.cursor.execute(query, values)
            approval_id = db.cursor.lastrowid
            
            logger.info(f"✅ Conteúdo criado em contentApprovals (ID: {approval_id})")
            return approval_id
    except Exception as e:
        logger.error(f"❌ Erro ao criar conteúdo para aprovação: {e}")
        return None

def get_pending_approvals(limit: int = 20) -> List[Dict[str, Any]]:
    """Obtém conteúdos pendentes de aprovação."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return []
            
            query = """
            SELECT * FROM contentApprovals 
            WHERE status = 'pending' 
            ORDER BY createdAt DESC 
            LIMIT %s
            """
            
            db.cursor.execute(query, (limit,))
            results = db.cursor.fetchall()
            
            logger.info(f"✅ {len(results)} conteúdos pendentes carregados.")
            return results
    except Exception as e:
        logger.error(f"❌ Erro ao buscar conteúdos pendentes: {e}")
        return []

def approve_content(approval_id: int) -> bool:
    """Aprova um conteúdo e move para posts."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return False
            
            # Atualiza status em contentApprovals
            query = """
            UPDATE contentApprovals 
            SET status = 'approved', approvedAt = NOW() 
            WHERE id = %s
            """
            db.cursor.execute(query, (approval_id,))
            
            # Copia para posts (histórico)
            query = """
            INSERT INTO posts (
                contentApprovalId, productId, productName, price, imageUrl, 
                affiliateUrl, title, description, hashtags, source, approvedAt
            )
            SELECT 
                id, productId, productName, productPrice, imageUrl,
                affiliateUrl, title, description, hashtags, source, NOW()
            FROM contentApprovals
            WHERE id = %s
            """
            db.cursor.execute(query, (approval_id,))
            
            logger.info(f"✅ Conteúdo {approval_id} aprovado e movido para posts.")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao aprovar conteúdo: {e}")
        return False

def discard_content(approval_id: int) -> bool:
    """Descarta um conteúdo."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return False
            
            query = """
            UPDATE contentApprovals 
            SET status = 'discarded' 
            WHERE id = %s
            """
            db.cursor.execute(query, (approval_id,))
            
            logger.info(f"✅ Conteúdo {approval_id} descartado.")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao descartar conteúdo: {e}")
        return False

def update_pipeline_pause(paused: bool) -> bool:
    """Atualiza o status de pausa do pipeline."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return False
            
            query = """
            UPDATE pipelineConfig 
            SET paused = %s 
            WHERE id = 1
            """
            db.cursor.execute(query, (paused,))
            
            status = "pausado" if paused else "retomado"
            logger.info(f"✅ Pipeline {status}.")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar status do pipeline: {e}")
        return False

def update_schedule_times(times: List[str]) -> bool:
    """Atualiza os horários agendados."""
    try:
        with DatabaseConnection() as db:
            if not db.connection:
                logger.warning("⚠️  Banco de dados não disponível.")
                return False
            
            import json
            times_json = json.dumps(times)
            
            query = """
            UPDATE pipelineConfig 
            SET scheduleTimes = %s 
            WHERE id = 1
            """
            db.cursor.execute(query, (times_json,))
            
            logger.info(f"✅ Horários atualizados: {times}")
            return True
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar horários: {e}")
        return False
