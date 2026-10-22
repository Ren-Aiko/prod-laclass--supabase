// =====================================================================
// app/api/keep-alive/route.ts
// Cloudflare Pages / Next.js Edge Runtime Keep-Alive Cron Endpoint
// Prevents Supabase Free Tier databases from pausing after 7 days of inactivity.
//
// CONFIGURATION INSTRUCTIONS:
// 1. Set up a free recurring ping on https://cron-job.org or https://uptimerobot.com
// 2. URL: https://<your-domain>.pages.dev/api/keep-alive
// 3. Frequency: Every 12 or 24 hours (e.g. 0 0,12 * * *)
// 4. Method: GET
// =====================================================================

export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sfqnaftcpuoyftpjgxbb.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x1k-8OB-6e4rCuYLuwUjNw_ylVYmLL3';

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    // Fast, lightweight query against products table to keep Postgres active
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      console.warn('[Keep-Alive Warning]:', error.message);
      return new Response(
        JSON.stringify({
          status: 'degraded',
          message: 'Pinged database but encountered warning.',
          error: error.message,
          latencyMs,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'LaClassé Supabase Keep-Alive',
        database: 'active',
        activeProductsCount: count,
        latencyMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: err.message || 'Keep-alive ping failed.',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
