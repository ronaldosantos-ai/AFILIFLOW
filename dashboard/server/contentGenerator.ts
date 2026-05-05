import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";

/**
 * Extrai dados do HTML da página do produto
 */
export async function extractProductDataFromUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Usar Gemini para extrair dados do HTML
    const extraction = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a web scraper expert. Extract product information from HTML.
Return a JSON object with: name, price, description, imageUrl (if found).
If a field is not found, use null.
Be precise and extract only the main product information.`,
        },
        {
          role: "user",
          content: `Extract product data from this HTML:\n\n${html.substring(0, 5000)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Product name" },
              price: { type: "number", description: "Product price" },
              description: { type: "string", description: "Product description" },
              imageUrl: { type: "string", description: "Product image URL" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = extraction.choices[0]?.message?.content;
    if (!content) throw new Error("No response from LLM");

    return JSON.parse(content);
  } catch (error) {
    console.error("Error extracting product data:", error);
    throw error;
  }
}

/**
 * Gera descrição AIDA (Atenção, Interesse, Desejo, Ação)
 */
export async function generateAidaDescription(productData: {
  name: string;
  price?: number;
  description?: string;
}) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert copywriter. Create a compelling AIDA (Attention, Interest, Desire, Action) description for an affiliate product.
The description should be:
- Attention: Catchy opening that grabs attention
- Interest: Highlight key features and benefits
- Desire: Create emotional connection and desire
- Action: Clear call-to-action

Write in Portuguese (Brazilian). Keep it concise (max 300 characters).
Make it engaging and suitable for social media (Instagram/Telegram).`,
        },
        {
          role: "user",
          content: `Create AIDA description for:
Product: ${productData.name}
Price: ${productData.price ? `R$ ${productData.price}` : "Not specified"}
Description: ${productData.description || "No description provided"}`,
        },
      ],
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating AIDA description:", error);
    throw error;
  }
}

/**
 * Gera imagem lifestyle do produto
 */
export async function generateLifestyleImage(productData: {
  name: string;
  description?: string;
}) {
  try {
    const prompt = `Create a professional lifestyle product image for: "${productData.name}". 
${productData.description ? `Product details: ${productData.description}` : ""}
Style: Modern, clean, professional product photography with lifestyle context.
Make it suitable for social media (Instagram/Telegram).
Show the product in a real-world context with good lighting and composition.`;

    const result = await generateImage({
      prompt,
    });

    return result.url;
  } catch (error) {
    console.error("Error generating lifestyle image:", error);
    throw error;
  }
}

/**
 * Processa URL completa: busca dados + gera conteúdo
 */
export async function processProductUrl(url: string) {
  try {
    // 1. Extrair dados da URL
    console.log("Extracting product data from URL...");
    const productData = await extractProductDataFromUrl(url);

    // 2. Gerar descrição AIDA
    console.log("Generating AIDA description...");
    const aidaDescription = await generateAidaDescription(productData);

    // 3. Gerar imagem lifestyle
    console.log("Generating lifestyle image...");
    const generatedImage = await generateLifestyleImage(productData);

    return {
      productName: productData.name,
      productPrice: productData.price,
      productImage: productData.imageUrl,
      productDescription: productData.description,
      aidaDescription,
      generatedImage,
    };
  } catch (error) {
    console.error("Error processing product URL:", error);
    throw error;
  }
}
