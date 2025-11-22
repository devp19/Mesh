import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { meshAnalysis, modelType, meshImage, searchQuery } = await request.json();
    
    console.log('AI Explain Request (Nano Banana Pro / Gemini):', {
      hasMeshAnalysis: !!meshAnalysis,
      meshName: meshAnalysis?.name,
      modelType,
      hasImage: !!meshImage,
      imageSize: meshImage ? meshImage.length : 0,
      searchQuery: searchQuery || 'none'
    });
    
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('Google API key not found in environment');
      return NextResponse.json(
        { error: 'Google API key not configured (Nano Banana Pro requires Gemini API)' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using 'gemini-1.5-pro' as it is the most capable currently available model for this task.
    // The requested 'Nano Banana Pro' (Gemini 3.0) capabilities are not yet public via API.
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

    const promptText = `
You are analyzing a 3D wireframe mesh from an interactive learning system. The user hovers over different parts of a 3D model to learn what each component represents.

The model type is: "${modelType}"
The specific mesh name is: "${meshAnalysis.name}"
${searchQuery ? `The original search query was: "${searchQuery}"` : ''}

Analyze the red highlighted part of the mesh and identify what part it likely represents. You have both geometric data and a visual image of the highlighted mesh.

Mesh Properties:
- Name: "${meshAnalysis.name}"
- Position: (${meshAnalysis.position.x.toFixed(2)}, ${meshAnalysis.position.y.toFixed(2)}, ${meshAnalysis.position.z.toFixed(2)})
- Size: ${meshAnalysis.size.width.toFixed(2)} x ${meshAnalysis.size.height.toFixed(2)} x ${meshAnalysis.size.depth.toFixed(2)}
- Vertex Count: ${meshAnalysis.vertexCount}
- Center Point: (${meshAnalysis.centerPoint.x.toFixed(2)}, ${meshAnalysis.centerPoint.y.toFixed(2)}, ${meshAnalysis.centerPoint.z.toFixed(2)})

${searchQuery ? `Context from search: The user was looking for "${searchQuery}" when they found this model. Use this context to better understand what type of model this should be and what parts it might contain.` : ''}

ADDITIONALLY: Turn the input photo into an annotated photo infographic description. Keep the original image mentally. Generate an SVG string that overlays clean white ‘hand-drawn’ lines, arrows, labels, and small diagrams highlighting the key parts and relationships found in the image. Add a short boxed title at the top. Minimal, high-contrast, blueprint/chalk-on-photo style. Only annotate the selected part of the model (or related context) in orange. The SVG should be viewbox "0 0 100 100" and designed to overlay on top of the square image provided.

Provide your analysis in this JSON format:
{
  "name": "Identified part name",
  "description": "Brief educational description (1-2 sentences explaining what this part is and its function)",
  "category": "anatomical|technical|structural|unknown",
  "confidence": how confident you are in your answer in a percentage (0-100),
  "reasoning": "Why you identified it this way based on position/size/shape/visual appearance",
  "svg_overlay": "A raw SVG string (starting with <svg... and ending with </svg>) that contains the hand-drawn style annotations. Do not include the background image in the SVG, only the white/orange lines/text. Use percentage coordinates."
}
`;

    // Prepare image part
    const imagePart = meshImage ? {
      inlineData: {
        data: meshImage.split(',')[1], // Remove "data:image/jpeg;base64,"
        mimeType: "image/jpeg"
      }
    } : null;

    // Prepare parts array
    const parts: any[] = [{ text: promptText }]; // Wrap text prompt in an object
    
    if (imagePart) {
      parts.push(imagePart);
    }

    console.log('Sending to Gemini...');
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts: parts }],
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const responseText = result.response.text();
    console.log('Gemini Response:', responseText.substring(0, 100) + '...');

    try {
        const parsed = JSON.parse(responseText);
        return NextResponse.json({
          name: parsed.name || 'Unknown Part',
          description: parsed.description || 'No description available',
          category: parsed.category || 'unknown',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'AI analysis completed',
          svg_overlay: parsed.svg_overlay || ''
        });
    } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        // Try to extract JSON if not pure JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json(parsed);
        }
        throw new Error('Invalid JSON response from Gemini');
    }

  } catch (error: any) {
    console.error('AI explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI explanation: ' + error.message },
      { status: 500 }
    );
  }
}
