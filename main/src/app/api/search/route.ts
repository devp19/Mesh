import { NextRequest, NextResponse } from 'next/server';

const SKETCHFAB_API_URL = 'https://api.sketchfab.com/v3/search';
const SKETCHFAB_API_KEY = process.env.SKETCHFAB_API_KEY;

interface SketchfabModel {
  uid: string;
  name: string;
  description?: string;
  thumbnails?: {
    images: Array<{
      url: string;
      size: number;
    }>;
  };
  downloadable?: boolean;
  isDownloadable?: boolean;
  tags?: any[]; // Accept any type, not just strings
}

interface SketchfabResponse {
  results: SketchfabModel[];
  total: number;
}

function getThumbnail(model: SketchfabModel): string | undefined {
  if (model?.thumbnails?.images?.[0]?.url) {
    return model.thumbnails.images[0].url;
  }
  return undefined;
}

// Score: 3 - exact, 2 - startsWith, 1 - tag, 0 - fallback/partial
function scoreModel(model: SketchfabModel, keyword: string): number {
  const lname = model.name?.toLowerCase() ?? "";
  const keywordInTags = Array.isArray(model.tags)
    ? model.tags.some(t => typeof t === "string" && t.toLowerCase() === keyword)
    : false;

  if (lname === keyword) return 3;
  if (lname.startsWith(keyword)) return 2;
  if (keywordInTags) return 1;
  return 0;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Use locally scoped key if environment variable fails
  const API_KEY = process.env.SKETCHFAB_API_KEY || '589b...'; // Fallback or debug key

  if (!API_KEY) {
    console.error('SKETCHFAB_API_KEY is missing in environment variables');
    return NextResponse.json({ error: 'Sketchfab API key is not configured' }, { status: 500 });
  }

  console.log('API Key configured:', API_KEY.substring(0, 4) + '...');

  try {
    const searchUrl = new URL(SKETCHFAB_API_URL);
    searchUrl.searchParams.set('type', 'models');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('downloadable', 'true');
    searchUrl.searchParams.set('staffpicked', 'false');
    searchUrl.searchParams.set('sort_by', '-relevance');
    searchUrl.searchParams.set('per_page', '10');
    
    // Filter for lower poly models to avoid explosion mess
    // 100k faces max usually keeps object count reasonable
    searchUrl.searchParams.set('max_face_count', '100000'); 
    searchUrl.searchParams.set('min_face_count', '100'); // Avoid tiny junk


    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Log raw response text for debugging if it fails
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sketchfab API Error:', response.status, errorText);
      return NextResponse.json({ error: 'Sketchfab API error', details: errorText }, { status: response.status });
    }

    const data: SketchfabResponse = await response.json();
    console.log('Sketchfab Search Response:', JSON.stringify(data, null, 2));

    if (!data.results) {
        console.error('Unexpected Sketchfab response format:', data);
        return NextResponse.json({ error: 'Invalid response from Sketchfab', details: data }, { status: 500 });
    }

    const downloadableModels = data.results.filter((model: SketchfabModel) =>
      model.downloadable === true || model.isDownloadable === true
    );
    if (!downloadableModels.length) {
      return NextResponse.json({ error: 'No downloadable models found for this search' }, { status: 404 });
    }

    const strictKeyword = query.trim().toLowerCase();

    // Score and sort models by exactness
    const scored = downloadableModels
      .map(m => ({ model: m, score: scoreModel(m, strictKeyword) }))
      .sort((a, b) => b.score - a.score);

    const topScore = scored[0].score;
    const bestMatches = scored.filter(x => x.score === topScore).map(x => x.model);

    // Pick the best match (with thumbnail etc.)
    const selectedModel = bestMatches.find(
      m => m.uid && m.name && getThumbnail(m)
    ) || downloadableModels[0];

    return NextResponse.json({
      uid: selectedModel.uid,
      name: selectedModel.name,
      description: selectedModel.description,
      thumbnail: getThumbnail(selectedModel),
      bestMatches: bestMatches.map(m => ({
        uid: m.uid,
        name: m.name,
        thumbnail: getThumbnail(m),
      })),
      tags: selectedModel.tags,
      downloadable: selectedModel.downloadable ?? selectedModel.isDownloadable,
      matchType: topScore, // 3 = exact, 2 = startsWith, 1 = tag, 0 = fallback
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search Sketchfab models', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
