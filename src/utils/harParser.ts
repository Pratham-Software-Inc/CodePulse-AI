import type { HarEntry } from '../types';

// Postman Collection to HAR entry converter (supports v1 and v2.x)
export function convertPostmanToHar(postmanJson: any): HarEntry[] {
  console.log('Converting Postman JSON to HAR');

  const isV2 = postmanJson.info?.schema?.includes('v2');
  const isV1 = postmanJson.info?.schema?.includes('v1') || postmanJson.info?.postman_id;

  if (!isV2 && !isV1) {
    throw new Error('Unsupported Postman Collection version');
  }

  const items = isV2
    ? extractItemsV2(postmanJson.item || [])
    : extractItemsV1(postmanJson.requests || []);

  return items.map((item: any) => {
    const url = item.url || '';
    const method = item.method?.toUpperCase() || 'GET';
    const headersArray = Object.entries(item.headers || {}).map(([name, value]) => ({
      name,
      value: String(value ?? '')
    }));

    const harEntry: HarEntry = {
      request: {
        method,
        url,
        headers: headersArray,
        postData: item.body ? { text: item.body } : undefined
      },
      response: {
        status: 0,
        statusText: '',
        content: { text: '' }
      }
    };

    return harEntry;
  });
}

function extractItemsV2(items: any[]): any[] {
  let flatItems: any[] = [];

  for (const item of items) {
    if (item.item) {
      flatItems = flatItems.concat(extractItemsV2(item.item));
    } else {
      flatItems.push(flattenRequestV2(item));
    }
  }

  return flatItems;
}

function flattenRequestV2(item: any): any {
  const request = item.request || {};

  const url = typeof request.url === 'string'
    ? request.url
    : request.url?.raw || formatUrlObject(request.url);

  const headers = (request.header || []).reduce((acc: any, header: any) => {
    acc[header.key] = header.value;
    return acc;
  }, {});

  let body = '';
  if (request.body) {
    const mode = request.body.mode;
    if (mode === 'raw') {
      body = request.body.raw || '';
    } else if (mode === 'urlencoded') {
      body = request.body.urlencoded?.map((param: any) => `${param.key}=${param.value}`).join('&') || '';
    } else if (mode === 'formdata') {
      body = request.body.formdata?.map((param: any) => `${param.key}=${param.value}`).join('&') || '';
    }
  }

  return { method: request.method, url, headers, body };
}

function formatUrlObject(urlObj: any): string {
  const protocol = urlObj.protocol || 'https';
  const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : urlObj.host;
  const path = Array.isArray(urlObj.path) ? '/' + urlObj.path.join('/') : urlObj.path;
  const query = urlObj.query?.map((q: any) => `${q.key}=${q.value}`).join('&');
  return `${protocol}://${host}${path}${query ? '?' + query : ''}`;
}

function extractItemsV1(requests: any[]): any[] {
  return requests.map((req: any) => ({
    method: req.method,
    url: req.url,
    headers: req.headers || {},
    body: req.rawModeData || req.data || ''
  }));
}

function isValidUrl(url: string): boolean {
  if (/{{\s*\w+\s*}}/.test(url)) return true;

  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function isExcludedRequest(url: string, method: string): boolean {
  try {
    const safeUrl = /{{\s*\w+\s*}}/.test(url)
      ? url.replace(/{{\s*\w+\s*}}/, 'https://placeholder-domain.com')
      : url;

    const urlObj = new URL(safeUrl);

    const excludedExtensions = new Set([
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', 
      '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot',
      '.map', '.json', '.html', '.htm'
    ]);

    const excludedDomains = new Set([
  // Google / GA / GTM
  'google-analytics.com',
  'www.google-analytics.com',
  'ssl.google-analytics.com',
  'analytics.google.com',
  'www.googletagmanager.com',
  'www.google.com/analytics',
  'www.google.com/ads/measurement',
  'www.google.com/measurement/conversion/',
  'g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'adservice.google.com',

  // Facebook / Meta
  'facebook.com',
  'facebook.com/tr',
  'connect.facebook.net',
  'graph.facebook.com',
  'analytics.facebook.com',
  'business.facebook.com',

  // LinkedIn
  'snap.licdn.com',
  'ads.linkedin.com',

  // Twitter
  'analytics.twitter.com',
  'ads-twitter.com',

  // Microsoft Clarity
  'clarity.ms',
  'www.clarity.ms',

  // Hotjar
  'hotjar.com',
  'static.hotjar.com',
  'insights.hotjar.com',

  // Mixpanel
  'mixpanel.com',
  'api.mixpanel.com',
  'cdn.mxpnl.com',

  // Segment
  'segment.com',
  'cdn.segment.com',
  'api.segment.io',

  // Crazy Egg
  'crazyegg.com',
  'script.crazyegg.com',

  // HubSpot
  'hubspot.com',
  'track.hubspot.com',

  // Adobe Analytics
  'omtrdc.net',
  'sc.omtrdc.net',
  'adobe.io',

  // Kissmetrics
  'kissmetrics.io',
  'trk.kissmetrics.com',

  // Quantcast
  'quantserve.com',
  'pixel.quantserve.com',

  // Amplitude
  'amplitude.com',
  'api.amplitude.com',
  'cdn.amplitude.com',

  // Cloudflare
  'cloudflareinsights.com',

  // New Relic
  'newrelic.com',

  // Datadog
  'datadoghq.com',

  // LogRocket
  'logrocket.io',

  // Shopify
  'shopify.com',
  'cdn.shopify.com',
  'analytics.shopify.com',

  // Wix
  'wix.com',
  'static.parastorage.com',

  // Open source analytics
  'plausible.io',
  'matomo.cloud',
  'simpleanalyticscdn.com',

  // Generic patterns
  'analytics',
  'tracking',
  'cdn.',
  'fonts.',
  'google.com'
]);


    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'DELETE']);

    if (!allowedMethods.has(method.toUpperCase())) return true;

    if (Array.from(excludedExtensions).some(ext => urlObj.pathname.toLowerCase().endsWith(ext))) return true;

    if (Array.from(excludedDomains).some(domain => urlObj.hostname.toLowerCase().includes(domain))) return true;

    const isAPIEndpoint = (
      urlObj.pathname.includes('/api/') ||
      urlObj.pathname.match(/\/v([1-9][0-9]{0,2}|1000)\//) ||
      urlObj.pathname.includes('/rest/') ||
      urlObj.pathname.includes('/graphql') ||
      urlObj.pathname.toLowerCase().startsWith('/') ||
      urlObj.pathname.toLowerCase().includes('/v1/') ||
      urlObj.pathname.toLowerCase().startsWith('/services/')
    );

    return !isAPIEndpoint;
  } catch {
    return true;
  }
}

function removeDuplicateRequests(entries: HarEntry[]): HarEntry[] {
  const uniqueRequests = new Map<string, HarEntry>();

  entries.forEach((entry) => {
    const rawUrl = entry.request.url;

    try {
      // Attempt parsing as full URL
      const urlObj = new URL(rawUrl);
      const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
      const key = `${entry.request.method} ${baseUrl}`;
      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, entry);
      }

    } catch (err) {
      // Fallback for template or relative URL like {{base_url}}/...
      const regex = /^(?:https?:\/\/)?([^/?]+)?(\/[^?#]*)?/;
      const match = rawUrl.match(regex);
      if (match && match[2]) {
        const fallbackPath = match[2]; // gets /v1/oauth2/token
        const key = `${entry.request.method} ${fallbackPath}`;
        if (!uniqueRequests.has(key)) {
          uniqueRequests.set(key, entry);
        }
      } else {
        console.warn(`❗ Skipped unrecognized URL: ${rawUrl}`);
      }
    }
  });

  return Array.from(uniqueRequests.values());
}


export function parseHarFile(harContent: string): HarEntry[] {
  console.log('Parsing input content...');

  try {
    const json = JSON.parse(harContent);

    const isPostman = json.info?.schema?.includes('postman') || json.info?.postman_id;
    if (isPostman) {
      console.log('Detected Postman collection, converting...');
      const entries = convertPostmanToHar(json);
      console.log('Converted entries:', entries);
      return removeDuplicateRequests(entries.filter(entry => {
        const url = entry.request.url || '';
        return isValidUrl(url) && !isExcludedRequest(url, entry.request.method);
      }));
    }

    if (!json.log || !Array.isArray(json.log.entries)) {
      throw new Error('Invalid HAR format: Missing log.entries array');
    }

    console.log('Detected HAR format, filtering entries...');

    const filteredEntries = json.log.entries
      .filter((entry: any) => {
        const url = entry.request?.url || '';
        if (!entry || !entry.request || typeof entry.request !== 'object' || !entry.request.method || !entry.request.url || !entry.response) {
          console.warn('Skipping invalid entry:', entry);
          return false;
        }
        return isValidUrl(url) && !isExcludedRequest(url, entry.request.method);
      })
      .map((entry: any) => {
        const headers = entry.request.headers
          ?.filter((header: any) => !new Set([
            ':authority', 'accept-language', 'accept-encoding', 'cache-control', 'content-length',
            'connection', 'cookie', 'origin', 'pragma', 'referer', 'sec-ch-ua', 'sec-ch-ua-mobile',
            'sec-ch-ua-platform', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user',
            'upgrade-insecure-requests', 'user-agent', 'x-requested-with'
          ]).has(header.name.toLowerCase()))
          ?.map((header: any) => ({
            name: header.name || '',
            value: header.value || ''
          })) || [];

        const isJsonResponse = entry.response.content?.mimeType?.includes('application/json');

        return {
          request: {
            method: entry.request.method || 'GET',
            url: entry.request.url || '',
            headers: headers,
            postData: entry.request.postData ? {
              text: entry.request.postData.text || ''
            } : undefined
          },
          response: {
            status: entry.response.status || 0,
            statusText: entry.response.statusText || '',
            content: isJsonResponse ? {
              text: entry.response.content?.text || ''
            } : {}
          }
        };
      });

    return removeDuplicateRequests(filteredEntries);
  } catch (err) {
    console.error('Failed to parse HAR/Postman content:', err);
    throw new Error('Invalid file format: Not a valid HAR or Postman JSON');
  }
}