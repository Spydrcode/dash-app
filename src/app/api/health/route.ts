import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    env_check: {
      has_openai_key: !!process.env.OPENAI_API_KEY,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai_key_length: process.env.OPENAI_API_KEY?.length || 0,
      supabase_url_domain: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0] || 'missing'
    }
  });
}