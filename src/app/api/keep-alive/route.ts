// =====================================================================
// src/app/api/keep-alive/route.ts
// Supabase Database Keep-Alive Route for Edge Runtime & Cloudflare Pages
// Prevents Supabase free-tier inactivity pauses via automated pings
// =====================================================================

import { supabase } from '../../../services/client';

export const runtime = 'edge';

// Edge-compliant JSON Response helper compatible with Next.js App Router & Cloudflare Edge
class NextResponse {
  static json(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }
}

export async function GET() {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      count: data?.length ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err?.message || 'Keep-alive check failed' }, { status: 500 });
  }
}
