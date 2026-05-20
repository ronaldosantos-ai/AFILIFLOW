"""
meta_publisher.py — AfiliFlow

Publicação via Meta API foi removida do fluxo automático.
Todo conteúdo é publicado manualmente pelo admin via dashboard.
Este arquivo existe apenas para não quebrar imports existentes.
"""

import logging
logger = logging.getLogger(__name__)


def publish_to_instagram(image_url: str = "", caption: str = "") -> bool:
    """Desativado — publicação manual via dashboard."""
    logger.info("ℹ️  Meta API desativada. Publicação é feita manualmente pelo admin.")
    return False
