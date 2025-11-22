import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json(
      { error: 'Model UID is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.SKETCHFAB_API_KEY || '589b...'; 

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Sketchfab API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Try different endpoints for download URLs
    const endpoints = [
      // Direct download endpoint
      `https://api.sketchfab.com/v3/models/${uid}/download`,
      // Alternative download endpoint
      `https://api.sketchfab.com/v3/models/${uid}/downloadable`,
      // File list endpoint
      `https://api.sketchfab.com/v3/models/${uid}/files`,
    ];

    console.log('🔍 Trying download endpoints for UID:', uid);

    for (const endpoint of endpoints) {
      console.log('📡 Trying:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success for', endpoint, ':', JSON.stringify(data, null, 2));
        return NextResponse.json({
          success: true,
          endpoint: endpoint,
          data: data
        });
      } else {
        const errorText = await response.text();
        console.log('❌ Failed for', endpoint, ':', errorText);
      }
    }

    // If all endpoints fail, try the model details again to see if we missed something
    console.log('🔍 Re-checking model details for download URLs...');
    const modelResponse = await fetch(`https://api.sketchfab.com/v3/models/${uid}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (modelResponse.ok) {
      const modelData = await modelResponse.json();
      
      // Look for any URL patterns that might be download links
      const allUrls: string[] = [];
      const dataString = JSON.stringify(modelData);
      
      // Common download URL patterns
      const urlPatterns = [
        /https:\/\/[^"]*\.glb/g,
        /https:\/\/[^"]*\.gltf/g,
        /https:\/\/[^"]*\.obj/g,
        /https:\/\/[^"]*\.fbx/g,
        /https:\/\/[^"]*download[^"]*/g,
      ];

      urlPatterns.forEach(pattern => {
        const matches = dataString.match(pattern);
        if (matches) {
          allUrls.push(...matches);
        }
      });

      console.log('🔗 Found potential URLs:', allUrls);

      return NextResponse.json({
        success: false,
        message: 'No direct download endpoints found, but searched for URLs in model data',
        potentialUrls: allUrls,
        modelData: modelData
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No download endpoints available',
      triedEndpoints: endpoints
    });

  } catch (error) {
    console.error('❌ Download API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch download URLs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
