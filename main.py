"""
main.py — AfiliFlow
Pipeline de busca e geração de conteúdo.
NÃO publica automaticamente em nenhum canal.
Todo conteúdo gerado vai para contentApprovals (Aprovações no dashboard).
"""

import logging
import os
import sys
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

import config
import cache
import shopee
import image_generator
import python_db_integration
import utm_pixel_tracking
import init_db_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("bot.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# HELPERS — banco de dados
# ─────────────────────────────────────────────────────────

def _get_pipeline_config():
    """Retorna a linha de configuração do pipeline no banco."""
    try:
        conn = init_db_tables.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM pipelineConfig ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return row or {}
    except Exception as e:
        logger.warning(f"⚠️ Não foi possível ler pipelineConfig: {e}")
        return {}


def is_pipeline_paused():
    """Verifica se o pipeline está pausado pelo admin no dashboard."""
    cfg = _get_pipeline_config()
    return bool(cfg.get("paused", False))


def _load_schedule_times_from_db():
    """Carrega horários salvos pelo admin no dashboard."""
    import json
    cfg = _get_pipeline_config()
    times = cfg.get("scheduleTimes")
    if times:
        if isinstance(times, str):
            times = json.loads(times)
        if times:
            logger.info(f"📅 Horários carregados do banco: {times}")
            return times
    return None


def _save_to_approvals(product, image_url, title, description, hashtags):
    """Salva conteúdo gerado em contentApprovals com status 'pending'."""
    try:
        conn = init_db_tables.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO contentApprovals (
                productId, productName, price, imageUrl, affiliateUrl,
                category, generatedTitle, generatedDescription, generatedHashtags,
                status, source, createdAt
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', 'automatic', NOW())
        """, (
            product.asin,
            product.title,
            product.price,
            image_url,
            product.affiliate_url,
            product.category_label,
            title,
            description,
            hashtags,
        ))
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"✅ Salvo em Aprovações — produto: {product.title}")
        return True
    except Exception as e:
        logger.error(f"❌ Erro ao salvar em contentApprovals: {e}")
        return False


def _log_execution(product, status, error_message=None):
    """Registra log de execução no banco."""
    try:
        python_db_integration.create_execution_log({
            'executionId': f"{product.asin}_{datetime.now().timestamp()}",
            'status': status,
            'productFound': product.asin,
            'productName': product.title,
            'channelsPublished': [],
            'errorMessage': error_message,
            'executionTime': 0,
        })
    except Exception as e:
        logger.warning(f"⚠️ Não foi possível registrar log: {e}")


# ─────────────────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────────────────

def run_pipeline():
    """
    Executa o pipeline de busca + geração de conteúdo.
    NÃO publica em nenhum canal — salva em Aprovações para o admin revisar.
    """
    logger.info("=" * 60)
    logger.info("🚀 Iniciando pipeline...")
    logger.info("=" * 60)

    # 0. Verifica pausa
    if is_pipeline_paused():
        logger.info("⏸️  Pipeline pausado pelo admin. Execução ignorada.")
        return

    # 1. Limpa cache expirado
    cache.clean_expired()

    # 2. Busca produto na Shopee
    product = shopee.get_product_for_run()
    if not product:
        logger.warning("⛔ Pipeline encerrado: nenhum produto disponível.")
        return

    # 3. Adiciona UTM ao link de afiliado
    try:
        tracker = utm_pixel_tracking.initialize_tracking_manager({
            'utm_source': 'afiliflow',
            'utm_medium': 'social',
            'gtm_id': os.getenv('GTM_ID'),
        })
        tracking_data = tracker.create_tracking_url(
            affiliate_url=product.affiliate_url,
            campaign_name=f"shopee_br_{datetime.now().strftime('%Y%m')}",
            product_name=product.title,
            category=product.category_label,
            product_id=product.asin,
            price=product.price,
        )
        product.affiliate_url = tracking_data['url']
    except Exception as e:
        logger.warning(f"⚠️ UTM não aplicado: {e}")

    logger.info(f"📦 Produto: {product.title}")
    logger.info(f"   R${product.price:.2f} | ⭐{product.rating} ({product.reviews} reviews)")
    logger.info(f"   Categoria: {product.category_label}")
    logger.info(f"   Link: {product.affiliate_url}")

    # 4. Gera imagem lifestyle
    logger.info("🎨 Gerando imagem lifestyle...")
    image_path = image_generator.generate_product_image(
        product_title=product.title,
        category=product.category,
        category_label=product.category_label,
        price=product.price,
        rating=product.rating,
        reviews=product.reviews,
        product_image_url=product.image_url,
        asin=product.asin,
    )

    if not image_path:
        logger.error("❌ Imagem: FALHOU — pipeline encerrado.")
        _log_execution(product, 'error', 'Falha na geração de imagem')
        return

    # 5. Upload para URL pública (Imgur)
    public_image_url = image_generator.get_public_image_url(image_path)
    if not public_image_url:
        logger.error("❌ Upload da imagem falhou — pipeline encerrado.")
        image_generator.cleanup_image(image_path)
        _log_execution(product, 'error', 'Falha no upload da imagem')
        return

    logger.info(f"🌐 Imagem pública: {public_image_url}")

    # 6. Gera título, descrição e hashtags via Gemini
    logger.info("✍️  Gerando conteúdo com Gemini...")
    try:
        generated = image_generator.generate_content_with_gemini(
            product_title=product.title,
            category_label=product.category_label,
            price=product.price,
            rating=product.rating,
            reviews=product.reviews,
            affiliate_url=product.affiliate_url,
        )
        gen_title = generated.get('title', product.title)
        gen_description = generated.get('description', '')
        gen_hashtags = generated.get('hashtags', '')
        logger.info(f"✅ Conteúdo gerado — título: {gen_title}")
    except Exception as e:
        logger.warning(f"⚠️ Gemini falhou, usando dados básicos: {e}")
        gen_title = product.title
        gen_description = f"{product.title} por R${product.price:.2f}. Avaliação: {product.rating}⭐ ({product.reviews} avaliações). Compre agora: {product.affiliate_url}"
        gen_hashtags = "#Shopee #MelhoresOfertas #Oferta"

    # 7. Remove imagem local temporária
    image_generator.cleanup_image(image_path)

    # 8. Salva em Aprovações (NÃO publica)
    logger.info("💾 Salvando em Aprovações...")
    saved = _save_to_approvals(
        product=product,
        image_url=public_image_url,
        title=gen_title,
        description=gen_description,
        hashtags=gen_hashtags,
    )

    if saved:
        # Marca no cache para não repetir
        db_saved = python_db_integration.add_cache_item(
            product_id=product.asin,
            product_name=product.title,
            image_url=product.image_url,
            affiliate_url=product.affiliate_url,
            category=product.category,
        )
        if not db_saved:
            cache.mark_published(product.asin)

        _log_execution(product, 'success')
        logger.info("=" * 60)
        logger.info("✅ Pipeline concluído. Produto salvo em Aprovações.")
        logger.info("=" * 60)
    else:
        _log_execution(product, 'error', 'Falha ao salvar em contentApprovals')
        logger.error("❌ Pipeline encerrado: falha ao salvar.")


# ─────────────────────────────────────────────────────────
# SCHEDULER
# ─────────────────────────────────────────────────────────

def start_scheduler():
    """Inicia o agendador com horários do banco ou do .env como fallback."""
    scheduler = BlockingScheduler(timezone="America/Sao_Paulo")

    schedule_times = _load_schedule_times_from_db() or config.SCHEDULE_TIMES

    if not schedule_times:
        logger.error("❌ Nenhum horário configurado.")
        sys.exit(1)

    for time_str in schedule_times:
        try:
            hour, minute = time_str.strip().split(":")
            scheduler.add_job(
                run_pipeline,
                trigger=CronTrigger(hour=int(hour), minute=int(minute)),
                id=f"pipeline_{time_str.replace(':', '')}",
                name=f"Pipeline {time_str}",
                misfire_grace_time=300,
            )
            logger.info(f"⏰ Agendado: {time_str} (Horário de Brasília)")
        except ValueError:
            logger.warning(f"⚠️ Horário inválido ignorado: '{time_str}'")

    logger.info(f"🤖 AfiliFlow iniciado com {len(scheduler.get_jobs())} horários.")
    logger.info("   Ctrl+C para encerrar.")

    try:
        scheduler.start()
    except KeyboardInterrupt:
        logger.info("👋 AfiliFlow encerrado.")
        scheduler.shutdown()


# ─────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════╗
║  🚀 AfiliFlow — melhoresofertasdaray         ║
╚══════════════════════════════════════════════╝
""")
    logger.info("🗄️  Inicializando banco de dados...")
    init_db_tables.init_db()

    try:
        config.validate()
    except EnvironmentError as e:
        logger.error(str(e))
        sys.exit(1)

    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg == "run":
            logger.info("▶️  Modo: execução única (teste)")
            run_pipeline()
        elif arg == "cache":
            stats = cache.get_stats()
            print(f"\n📊 Cache: {stats['total_published']} produtos no cache")
        else:
            print(f"Uso: python main.py [run|cache]")
    else:
        start_scheduler()
