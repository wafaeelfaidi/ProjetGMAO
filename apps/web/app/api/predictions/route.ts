import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// FastAPI server URL - update this based on your deployment
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET() {
    try {
        console.log(`Fetching predictions from FastAPI: ${FASTAPI_URL}/predictions/all`);
        
        const response = await fetch(`${FASTAPI_URL}/predictions/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Add timeout
            signal: AbortSignal.timeout(30000), // 30 seconds timeout
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('FastAPI error:', errorData);
            return NextResponse.json({
                error: 'Failed to fetch predictions from FastAPI',
                details: errorData,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();
        
        // Return the data from FastAPI (which has structure: {success, data, count})
        if (data.success) {
            return NextResponse.json(data.data);
        } else {
            return NextResponse.json({
                error: 'Prediction failed',
                details: data
            }, { status: 500 });
        }
        
    } catch (error: any) {
        console.error('Error connecting to FastAPI:', error);
        return NextResponse.json({
            error: 'Failed to connect to prediction service',
            details: error.message,
            fastApiUrl: FASTAPI_URL
        }, { status: 500 });
    }
}
