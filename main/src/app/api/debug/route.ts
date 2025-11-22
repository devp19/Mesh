import { NextResponse } from 'next/server';

const SKETCHFAB_API_KEY = process.env.SKETCHFAB_API_KEY;

export async function GET() {
  console.log('🔍 Debug endpoint called');
  console.log('🔑 API Key present:', !!SKETCHFAB_API_KEY);
  console.log('🔑 API Key length:', SKETCHFAB_API_KEY?.length || 0);
  console.log('🔑 API Key starts with:', SKETCHFAB_API_KEY?.substring(0, 10) + '...');

  // Test a simple API call to verify the key works
  try {
    const testUrl = 'https://api.sketchfab.com/v3/me';
    console.log('📡 Testing API call to:', testUrl);

    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Token ${SKETCHFAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Test response status:', response.status);

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ API key is valid. User data:', userData);
      return NextResponse.json({
        status: 'success',
        apiKeyPresent: !!SKETCHFAB_API_KEY,
        apiKeyLength: SKETCHFAB_API_KEY?.length || 0,
        testResponse: userData,
        message: 'API key is working correctly'
      });
    } else {
      const errorText = await response.text();
      console.error('❌ API key test failed:', errorText);
      return NextResponse.json({
        status: 'error',
        apiKeyPresent: !!SKETCHFAB_API_KEY,
        apiKeyLength: SKETCHFAB_API_KEY?.length || 0,
        error: `API key test failed: ${response.status}`,
        errorDetails: errorText,
        message: 'API key may be invalid or expired'
      });
    }
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      status: 'error',
      apiKeyPresent: !!SKETCHFAB_API_KEY,
      apiKeyLength: SKETCHFAB_API_KEY?.length || 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test API key'
    });
  }
}
