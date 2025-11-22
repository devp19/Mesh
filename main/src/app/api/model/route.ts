import { NextRequest, NextResponse } from 'next/server';

const SKETCHFAB_API_URL = 'https://api.sketchfab.com/v3/models';
const SKETCHFAB_API_KEY = process.env.SKETCHFAB_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json(
      { error: 'Model UID is required' },
      { status: 400 }
    );
  }

  if (!SKETCHFAB_API_KEY) {
    return NextResponse.json(
      { error: 'Sketchfab API key is not configured' },
      { status: 500 }
    );
  }

  try {
    console.log('🔍 Getting model details for UID:', uid);

    // Get model details including download URLs
    const modelUrl = `${SKETCHFAB_API_URL}/${uid}`;
    console.log('📡 Request URL:', modelUrl);

    const response = await fetch(modelUrl, {
      headers: {
        'Authorization': `Token ${SKETCHFAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Model response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Model API Error:', errorText);
      throw new Error(`Sketchfab model API error: ${response.status} - ${errorText}`);
    }

    const modelData = await response.json();
    console.log('🔍 Full API response:', JSON.stringify(modelData, null, 2));
        
        // Check for download options
        if (modelData.isDownloadable) {
          console.log('✅ Model is downloadable!');
          console.log('📥 Download options:', modelData.downloadOptions);
        } else {
          console.log('❌ Model is not downloadable');
        }
        
        // Log all available URLs
        console.log('🔗 Available URLs:');
        console.log('- Embed URL:', modelData.embedUrl);
        console.log('- Viewer URL:', modelData.viewerUrl);
        console.log('- Thumbnails:', modelData.thumbnails);
        
        // Check if there are any download-related fields
        console.log('🔍 All response keys:', Object.keys(modelData));
        
        return NextResponse.json({
          uid: modelData.uid,
          name: modelData.name,
          description: modelData.description,
          embedUrl: modelData.embedUrl,
          viewerUrl: modelData.viewerUrl,
          thumbnails: modelData.thumbnails,
          isDownloadable: modelData.isDownloadable,
          downloadOptions: modelData.downloadOptions,
          allUrls: {
            embedUrl: modelData.embedUrl,
            viewerUrl: modelData.viewerUrl,
            // Look for any other URL fields
            ...(modelData.gltfUrl && { gltfUrl: modelData.gltfUrl }),
            ...(modelData.objUrl && { objUrl: modelData.objUrl }),
            ...(modelData.fbxUrl && { fbxUrl: modelData.fbxUrl }),
          }
        });
  } catch (error) {
    console.error('❌ Model fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
