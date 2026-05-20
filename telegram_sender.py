"""
telegram_sender.py — AfiliFlow

Envio automático via Telegram foi removido do pipeline.
Todo conteúdo é copiado e publicado manualmente pelo admin via dashboard.
Este arquivo existe apenas para não quebrar imports existentes.
"""

import logging
logger = logging.getLogger(__name__)


def send_affiliate_link(affiliate_url: str = "", product_title: str = "") -> bool:
    """Desativado — publicação é feita manualmente pelo admin."""
    logger.info("ℹ️  Telegram automático desativado. Publicação é feita manualmente.")
    return False
