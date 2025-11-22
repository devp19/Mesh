import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { meshAnalysis, modelType, meshImage, searchQuery } = await request.json();
    
    console.log('AI Explain Request:', {
      hasMeshAnalysis: !!meshAnalysis,
      meshName: meshAnalysis?.name,
      modelType,
      hasImage: !!meshImage,
      imageSize: meshImage ? meshImage.length : 0,
      searchQuery: searchQuery || 'none'
    });
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('API Key found, length:', apiKey.length);

    let prompt = `
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

Provide your analysis in this JSON format:
{
  "name": "Identified part name",
  "description": "Brief educational description (1-2 sentences explaining what this part is and its function)",
  "category": "anatomical|technical|structural|unknown",
  "confidence": how confident you are in your answer in a percentage (0-100),
  "reasoning": "Why you identified it this way based on position/size/shape/visual appearance"
}
`;

    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert anatomical and technical model identifier. Analyze 3D mesh properties to identify parts. 
        Provide concise, educational explanations. Consider the model type: ${modelType}.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Add image if provided
    if (meshImage) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Here is a visual rendering of the mesh to help with identification:'
          },
          {
            type: 'image_url',
            image_url: {
              url: meshImage
            }
          }
        ]
      });
    }

    console.log('Sending to OpenAI:', {
      messageCount: messages.length,
      hasImageContent: messages.some(msg => msg.content && Array.isArray(msg.content) && msg.content.some((c: any) => c.type === 'image_url')),
      promptLength: prompt.length
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        requestBody: {
          model: 'gpt-4o',
          messageCount: messages.length,
          hasImage: !!meshImage
        }
      });
      throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Try to parse JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          name: parsed.name || 'Unknown Part',
          description: parsed.description || 'No description available',
          category: parsed.category || 'unknown',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'AI analysis completed'
        });
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    }
    
    // Fallback response
    return NextResponse.json({
      name: 'AI Identified Part',
      description: aiResponse.substring(0, 100) + '...',
      category: 'ai_identified',
      confidence: 0.6,
      reasoning: 'AI analysis completed'
    });

  } catch (error) {
    console.error('AI explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI explanation' },
      { status: 500 }
    );
  }
}
