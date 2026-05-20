"""
image_generator.py
Gera imagem lifestyle do produto com CTAs e gatilhos de conversão
usando a API do Gemini (google-genai) com Imagen 4.
"""

import os
import base64
import requests
import logging
from io import BytesIO
from PIL import Image

from google import genai
from google.genai import types
import config

logger = logging.getLogger(__name__)

# Configura o cliente Gemini
client = genai.Client(api_key=config.GEMINI_API_KEY)

CATEGORY_TRIGGERS = {
    "HomeAndKitchen": [
        "Transforme sua casa agora",
        "Frete grátis",
        "Mais de {reviews} compradores satisfeitos",
        "Qualidade garantida ⭐{rating}",
    ],
    "BeautyAndPersonalCare": [
        "Resultado comprovado",
        "Mais de {reviews} avaliações positivas",
        "Cuidado que você merece ✨",
        "⭐{rating} — Top vendas",
    ],
    "SportsAndOutdoors": [
        "Supere seus limites 💪",
        "Avaliado por {reviews}+ atletas",
        "Performance de elite",
        "⭐{rating} — Melhor custo-benefício",
    ],
    "Electronics": [
        "Tecnologia de ponta 🔥",
        "Frete grátis",
        "{reviews}+ clientes satisfeitos",
        "⭐{rating} — Escolha dos especialistas",
    ],
}

DEFAULT_TRIGGERS = [
    "Oferta imperdível 🔥",
    "Frete grátis",
    "Mais de {reviews} avaliações",
    "⭐{rating} estrelas",
]


def _get_triggers(category: str, rating: float, reviews: int) -> list[str]:
    triggers = CATEGORY_TRIGGERS.get(category, DEFAULT_TRIGGERS)
    result = []
    for t in triggers[:3]:
        t = t.replace("{rating}", str(rating))
        t = t.replace("{reviews}", f"{reviews:,}".replace(",", "."))
        result.append(t)
    return result


def _build_image_prompt(product_title: str, category_label: str,
                        price: float, triggers: list[str]) -> str:
    triggers_text = " | ".join(triggers)
    return (
        f"Create a professional lifestyle product advertisement image for Instagram. "
        f"The product is: {product_title}. Category: {category_label}. "
        f"Style: bright, clean, modern lifestyle photography with soft shadows. "
        f"Background: minimal, light gradient or clean white/beige surface. "
        f"The product should be the hero of the image, beautifully lit. "
        f"Add a subtle overlay text panel at the bottom with these CTAs in Portuguese: "
        f"'{triggers_text}'. "
        f"Also display the price 'R$ {price:.2f}' prominently. "
        f"Use bold, readable typography. Color palette: warm and inviting. "
        f"Square format (1:1), high quality, photorealistic. "
        f"Do NOT add any store logo or watermarks."
    )


def _download_product_image(image_url: str) -> bytes | None:
    try:
        response = requests.get(image_url, timeout=15)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.warning(f"⚠️  Não foi possível baixar imagem do produto: {e}")
        return None


def generate_product_image(
    product_title: str,
    category: str,
    category_label: str,
    price: float,
    rating: float,
    reviews: int,
    product_image_url: str,
    asin: str,
) -> str | None:
    triggers = _get_triggers(category, rating, reviews)
    prompt = _build_image_prompt(product_title, category_label, price, triggers)

    logger.info(f"🎨 Gerando imagem para: {product_title[:50]}...")
    logger.info(f"   Gatilhos: {triggers}")

    result = _generate_with_imagen4(prompt, asin)
    if result:
        return result

    logger.info("⚡ Tentando fallback com Gemini Flash Image...")
    return _generate_with_gemini_flash(prompt, asin, product_image_url)


def _generate_with_imagen4(prompt: str, asin: str) -> str | None:
    try:
        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
                person_generation="DONT_ALLOW",
            ),
        )

        if response.generated_images:
            image_bytes = response.generated_images[0].image.image_bytes
            output_path = f"generated_{asin}.jpg"
            img = Image.open(BytesIO(image_bytes))
            img = img.convert("RGB")
            img.save(output_path, "JPEG", quality=92)
            logger.info(f"✅ Imagem gerada (Imagen 4): {output_path}")
            return output_path

        logger.warning("❌ Imagen 4: Nenhuma imagem retornada.")
        return None

    except Exception as e:
        logger.error(f"❌ Erro ao gerar imagem com Imagen 4: {e}")
        return None


def _generate_with_gemini_flash(prompt: str, asin: str,
                                product_image_url: str) -> str | None:
    try:
        product_img_bytes = _download_product_image(product_image_url)

        contents = []
        if product_img_bytes:
            contents.append(
                types.Part.from_bytes(
                    data=product_img_bytes,
                    mime_type="image/jpeg",
                )
            )
            contents.append(f"Based on this product image, {prompt}")
        else:
            contents.append(prompt)

        response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        output_path = f"generated_{asin}.jpg"
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image"):
                img_bytes = part.inline_data.data
                with open(output_path, "wb") as f:
                    f.write(img_bytes)
                logger.info(f"✅ Imagem (fallback) gerada: {output_path}")
                return output_path

        logger.warning("❌ Fallback: sem imagem na resposta.")
        return None

    except Exception as e:
        logger.error(f"❌ Fallback também falhou: {e}")
        return None


def get_public_image_url(image_path: str) -> str | None:
    """
    Faz upload da imagem para o Imgur e retorna a URL pública.
    Imgur aceita uploads anônimos sem autenticação.
    """
    if not image_path or not os.path.exists(image_path):
        logger.error(f"❌ Imagem não encontrada: {image_path}")
        return None

    try:
        with open(image_path, "rb") as f:
            image_data = f.read()

        b64_image = base64.b64encode(image_data).decode("utf-8")

        response = requests.post(
            "https://api.imgur.com/3/image",
            headers={"Authorization": "Client-ID 546c25a59c58ad7"},
            data={"image": b64_image, "type": "base64"},
            timeout=30,
        )

        result = response.json()

        if result.get("success"):
            url = result["data"]["link"]
            logger.info(f"✅ Imagem uploaded para Imgur: {url}")
            return url
        else:
            logger.error(f"❌ Imgur upload falhou: {result}")
            return None

    except Exception as e:
        logger.error(f"❌ Erro ao fazer upload para Imgur: {e}")
        return None


def build_caption(product_title: str, category_label: str,
                  price: float, rating: float,
                  reviews: int, affiliate_url: str) -> str:
    stars = "⭐" * min(round(rating), 5)
    price_str = f"R$ {price:.2f}"
    caption = (
        f"🔥 {product_title}\n\n"
        f"💰 {price_str}\n"
        f"{stars} {rating}/5 — {reviews:,} avaliações\n\n"
        f"✅ Frete grátis\n"
        f"✅ Entrega rápida\n\n"
        f"👉 Compre agora: {affiliate_url}\n\n"
        f"#{category_label.replace(' ', '')} "
        f"#MelhoresOfertas #Oferta #Compras #Shopee"
    )
    return caption.replace(",", ".")


def cleanup_image(image_path: str):
    try:
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
            logger.info(f"🗑️  Imagem temporária removida: {image_path}")
    except Exception as e:
        logger.warning(f"⚠️  Não foi possível remover {image_path}: {e}")

# ─────────────────────────────────────────────────────────
#  FASE 2: GERAÇÃO DE CONTEÚDO COM GEMINI
# ─────────────────────────────────────────────────────────

def generate_content_with_gemini(
    product_title: str,
    category_label: str,
    price: float,
    rating: float,
    reviews: int,
    product_description: str = "",
    custom_prompt: str = None
) -> dict:
    """
    Gera conteúdo completo (título, descrição, hashtags) com Gemini.
    
    Args:
        product_title: Nome do produto
        category_label: Categoria do produto
        price: Preço do produto
        rating: Avaliação do produto
        reviews: Número de avaliações
        product_description: Descrição do produto (opcional)
        custom_prompt: Prompt customizado para regerar conteúdo (opcional)
    
    Returns:
        dict com 'title', 'description', 'hashtags'
    """
    try:
        # Seleciona gatilhos por categoria
        category_key = category_label.replace(" ", "").replace("&", "And")
        triggers = CATEGORY_TRIGGERS.get(category_key, DEFAULT_TRIGGERS)
        
        # Formata gatilhos
        formatted_triggers = []
        for trigger in triggers[:2]:  # Usa apenas 2 gatilhos
            formatted_trigger = trigger.format(
                reviews=reviews,
                rating=f"{rating:.1f}"
            )
            formatted_triggers.append(formatted_trigger)
        
        triggers_text = "\n".join([f"- {t}" for t in formatted_triggers])
        
        # Monta o prompt
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = f"""Você é um especialista em copywriting para redes sociais.
            
Gere conteúdo para uma postagem de produto afiliado com as seguintes informações:

📦 Produto: {product_title}
💰 Preço: R$ {price:.2f}
⭐ Avaliação: {rating}/5 ({reviews} avaliações)
📂 Categoria: {category_label}
📝 Descrição: {product_description or 'Não fornecida'}

Gatilhos de compra para esta categoria:
{triggers_text}

Por favor, gere:

1. **Título**: Mantenha o nome original do produto SEM caixa alta. Máximo 60 caracteres.
   Exemplo: "Fone Bluetooth 5.0 com cancelamento de ruído"

2. **Descrição**: Uma descrição persuasiva com 150-200 caracteres que:
   - Destaque os principais benefícios
   - Inclua pelo menos um dos gatilhos acima
   - Termine com um CTA ("Compre agora", "Aproveite", etc)
   - Use emojis estrategicamente
   - Seja adequada para Instagram/Telegram

3. **Hashtags**: 8-10 hashtags relevantes separadas por espaço
   - Inclua hashtags genéricas (#MelhoresOfertas, #Oferta, #Compras)
   - Inclua hashtags específicas da categoria
   - Inclua hashtags de trending (se aplicável)

Responda em JSON com a seguinte estrutura:
{{
  "title": "...",
  "description": "...",
  "hashtags": "#hashtag1 #hashtag2 ..."
}}"""
        
        # Chama Gemini
        logger.info("🤖 Chamando Gemini para gerar conteúdo...")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT"],
            ),
        )
        
        # Extrai resposta
        response_text = response.candidates[0].content.parts[0].text
        logger.info(f"📝 Resposta do Gemini:\n{response_text}")
        
        # Parse JSON
        import json
        import re
        
        # Tenta extrair JSON da resposta
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            content = json.loads(json_str)
        else:
            # Fallback se não conseguir extrair JSON
            logger.warning("⚠️  Não consegui extrair JSON. Usando valores padrão.")
            content = {
                "title": product_title,
                "description": f"🔥 {product_title}\n💰 R$ {price:.2f}\n⭐ {rating}/5 ({reviews} avaliações)\n👉 Compre agora!",
                "hashtags": f"#MelhoresOfertas #{category_label.replace(' ', '')} #Oferta #Compras #Shopee"
            }
        
        logger.info(f"✅ Conteúdo gerado com sucesso!")
        logger.info(f"   Título: {content.get('title', '')}")
        logger.info(f"   Descrição: {content.get('description', '')[:50]}...")
        logger.info(f"   Hashtags: {content.get('hashtags', '')[:50]}...")
        
        return content
        
    except Exception as e:
        logger.error(f"❌ Erro ao gerar conteúdo com Gemini: {e}")
        # Retorna conteúdo padrão em caso de erro
        return {
            "title": product_title,
            "description": f"🔥 {product_title}\n💰 R$ {price:.2f}\n⭐ {rating}/5\n👉 Compre agora!",
            "hashtags": "#MelhoresOfertas #Oferta #Compras #Shopee"
        }
