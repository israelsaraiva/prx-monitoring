import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { url, method, headers, body, timeout, sslVerification } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required', time: 0 }, { status: 400 });
    }

    const requestHeaders = { ...(headers || {}) } as Record<string, string>;
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: requestHeaders,
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      if (typeof body === 'string') {
        fetchOptions.body = body;
      } else if (body?.type === 'urlencoded' && Array.isArray(body.entries)) {
        fetchOptions.body = new URLSearchParams(body.entries);
      } else if (body?.type === 'form-data' && Array.isArray(body.entries)) {
        const formData = new FormData();
        body.entries.forEach(([key, value]: [string, string]) => {
          formData.append(key, value);
        });
        fetchOptions.body = formData;

        Object.keys(requestHeaders).forEach((headerKey) => {
          if (headerKey.toLowerCase() === 'content-type') {
            delete requestHeaders[headerKey];
          }
        });
      } else {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    // Apply timeout via AbortController
    const timeoutMs = typeof timeout === 'number' && timeout > 0 ? timeout : 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    // Apply SSL verification toggle
    const prevTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (sslVerification === false) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } finally {
      clearTimeout(timeoutId);
      // Restore TLS setting
      if (sslVerification === false) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTlsReject ?? '1';
      }
    }
    const endTime = Date.now();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseText = await response.text();
    let responseData;
    let isJson = false;
    try {
      responseData = JSON.parse(responseText);
      isJson = true;
    } catch (e) {
      responseData = responseText;
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      isJson,
      time: endTime - startTime,
      size: responseText.length,
    });
  } catch (error: any) {
    const time = Date.now() - startTime;
    const isTimeout = error?.name === 'AbortError';
    if (isTimeout) {
      return NextResponse.json({ error: 'Request timed out', errorCode: 'TIMEOUT', time }, { status: 500 });
    }
    const cause = error?.cause;
    const causeMessage = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : null;
    const causeCode: string | undefined = cause instanceof Error ? (cause as any).code : undefined;
    const message = causeMessage ?? error?.message ?? 'Failed to execute request';
    return NextResponse.json({ error: message, errorCode: causeCode, time }, { status: 500 });
  }
}
