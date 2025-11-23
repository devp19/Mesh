import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { meshAnalysis, modelType, meshImage, searchQuery } =
      await request.json();

    console.log("AI Explain Request (OpenRouter / Gemini):", {
      hasMeshAnalysis: !!meshAnalysis,
      meshName: meshAnalysis?.name,
      modelType,
      hasImage: !!meshImage,
      imageSize: meshImage ? meshImage.length : 0,
      searchQuery: searchQuery || "none",
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName =
      process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";

    if (!apiKey) {
      console.error("OpenRouter API key not found in environment");
      return NextResponse.json(
        {
          error:
            "OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    if (!meshImage) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // First, get the text description
    const analysisPrompt = `
You are analyzing a 3D wireframe mesh from an interactive learning system. The user hovers over different parts of a 3D model to learn what each component represents.

The model type is: "${modelType}"
The specific mesh name is: "${meshAnalysis.name}"
${searchQuery ? `The original search query was: "${searchQuery}"` : ""}

Analyze the highlighted part of the mesh and identify what part it likely represents. You have both geometric data and a visual image of the highlighted mesh.

Mesh Properties:
- Name: "${meshAnalysis.name}"
- Position: (${meshAnalysis.position.x.toFixed(
      2
    )}, ${meshAnalysis.position.y.toFixed(
      2
    )}, ${meshAnalysis.position.z.toFixed(2)})
- Size: ${meshAnalysis.size.width.toFixed(
      2
    )} x ${meshAnalysis.size.height.toFixed(
      2
    )} x ${meshAnalysis.size.depth.toFixed(2)}
- Vertex Count: ${meshAnalysis.vertexCount}
- Center Point: (${meshAnalysis.centerPoint.x.toFixed(
      2
    )}, ${meshAnalysis.centerPoint.y.toFixed(
      2
    )}, ${meshAnalysis.centerPoint.z.toFixed(2)})

${
  searchQuery
    ? `Context from search: The user was looking for "${searchQuery}" when they found this model. Use this context to better understand what type of model this should be and what parts it might contain.`
    : ""
}

Provide your analysis in this JSON format:
{
  "name": "Identified part name",
  "description": "Brief educational description (1-2 sentences explaining what this part is and its function)",
  "category": "anatomical|technical|structural|unknown",
  "confidence": how confident you are in your answer in a percentage (0-100),
  "reasoning": "Why you identified it this way based on position/size/shape/visual appearance"
}
`;

    console.log("Getting text analysis from OpenRouter...");

    // Make request to OpenRouter for text analysis
    const analysisResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "VisionView",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: analysisPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: meshImage, // OpenRouter accepts data URLs directly
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("OpenRouter API error:", errorText);
      throw new Error(
        `OpenRouter API error: ${analysisResponse.status} - ${errorText}`
      );
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices?.[0]?.message?.content || "";

    console.log("Analysis Response:", analysisText.substring(0, 100) + "...");

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("Failed to parse analysis response:", parseError);
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        parsedAnalysis = {
          name: "Unknown Part",
          description: "Analysis completed",
          category: "unknown",
          confidence: 0,
          reasoning: "Could not parse response",
        };
      }
    }

    // Second, generate the annotated image using the exact prompt
    const imagePrompt = `Turn the input photo into an annotated photo infographic. Keep the original image. Overlay clean white 'modern wireframe mesh' lines, arrows, labels, and small diagrams highlighting the key parts and relationships. Add a short boxed title at the top. Minimal, high-contrast, modern font-mono style. Only annotate the selected part in purple.`;

    console.log("Generating annotated image from OpenRouter...");

    // Make request to OpenRouter for image generation
    // Note: For image generation, we'll use a model that supports it
    // gemini-3-pro-image-preview might not be available via OpenRouter, so we'll use gemini-2.0-flash-exp or similar
    const imageResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "VisionView",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: imagePrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: meshImage,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"], // Required for image generation
        }),
      }
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("OpenRouter image generation error:", errorText);
      throw new Error(
        `OpenRouter image generation error: ${imageResponse.status} - ${errorText}`
      );
    }

    const imageData = await imageResponse.json();

    // Log the full response for debugging
    console.log(
      "Image generation response structure:",
      JSON.stringify(imageData, null, 2).substring(0, 1000)
    );

    const message = imageData.choices?.[0]?.message || {};
    const imageText = message.content || "";

    // Extract image from response
    let annotatedImageBase64 = null;

    // Check multiple possible response formats for image generation
    // 1. Check if there's an images array in the message (OpenRouter format with modalities)
    if (
      message.images &&
      Array.isArray(message.images) &&
      message.images.length > 0
    ) {
      annotatedImageBase64 =
        message.images[0].image_url?.url || message.images[0].url;
      console.log("Found image in message.images array");
    }

    // 2. Check if content is an array with image parts
    if (!annotatedImageBase64 && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          annotatedImageBase64 = part.image_url.url;
          console.log("Found image_url in content array");
          break;
        }
      }
    }

    // 3. Check if there's an image_url directly in the message
    if (!annotatedImageBase64 && message.image_url) {
      annotatedImageBase64 = message.image_url.url;
      console.log("Found image_url in message");
    }

    // 4. Check if response contains image data in the text content (base64)
    if (!annotatedImageBase64) {
      const base64Match = imageText.match(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/
      );
      if (base64Match) {
        annotatedImageBase64 = base64Match[0];
        console.log("Found base64 image in text content");
      }
    }

    // 5. Check for base64 without data URL prefix
    if (!annotatedImageBase64) {
      const base64OnlyMatch = imageText.match(/[A-Za-z0-9+/=]{100,}/);
      if (base64OnlyMatch && base64OnlyMatch[0].length > 500) {
        // Likely a base64 image, add data URL prefix
        annotatedImageBase64 = `data:image/png;base64,${base64OnlyMatch[0]}`;
        console.log("Found base64 string in content, added data URL prefix");
      }
    }

    // 6. Check if there's a separate image field in the response
    if (!annotatedImageBase64 && imageData.image) {
      annotatedImageBase64 = imageData.image;
      console.log("Found image in response root");
    }

    console.log(
      "Image extraction result:",
      annotatedImageBase64 ? "SUCCESS - Image found" : "FAILED - No image found"
    );
    if (!annotatedImageBase64) {
      console.log(
        "Full response for debugging:",
        JSON.stringify(imageData, null, 2)
      );
    }

    return NextResponse.json({
      name: parsedAnalysis.name || "Unknown Part",
      description: parsedAnalysis.description || "No description available",
      category: parsedAnalysis.category || "unknown",
      confidence: parsedAnalysis.confidence || 0.5,
      reasoning: parsedAnalysis.reasoning || "AI analysis completed",
      annotatedImage: annotatedImageBase64,
    });
  } catch (error: any) {
    console.error("AI explanation error:", error);
    return NextResponse.json(
      { error: "Failed to get AI explanation: " + error.message },
      { status: 500 }
    );
  }
}
