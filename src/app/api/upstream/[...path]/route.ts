import { backendApiUrl } from '@/auth/backend-url';
import { NextResponse, type NextRequest } from 'next/server';

/** Save / shapes.txt peut dépasser 60s sur un gros feed. */
export const maxDuration = 180;

type RouteContext = { params: Promise<{ path: string[] }> };

function upstreamUrl(request: NextRequest, path: string[]): URL {
  const base = backendApiUrl();
  const suffix = path.join('/');
  const url = new URL(suffix, base.endsWith('/') ? base : `${base}/`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxy(request: NextRequest, path: string[]) {
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) {
    headers.set('Authorization', auth);
  }
  headers.set('Accept', request.headers.get('accept') ?? 'application/json');
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(upstreamUrl(request, path), init);
  const outHeaders = new Headers();
  const upstreamType = res.headers.get('content-type');
  if (upstreamType) {
    outHeaders.set('Content-Type', upstreamType);
  }
  return new NextResponse(res.body, { status: res.status, headers: outHeaders });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
