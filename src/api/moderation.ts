import type { QueryLabelsResponse } from "~/types/moderation";

export const fetchLabelsBatch = async (
  serviceUrl: string,
  uris: string[],
): Promise<QueryLabelsResponse> => {
  const url = new URL(`${serviceUrl}/xrpc/com.atproto.label.queryLabels`);
  uris.forEach((uri) => url.searchParams.append("uriPatterns", uri));
  
  // 1. Setup Timeout (5 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as QueryLabelsResponse;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[fetchLabelsBatch] Timeout querying ${serviceUrl}`);
    } else {
      console.error(`[fetchLabelsBatch] Error querying ${serviceUrl}:`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};