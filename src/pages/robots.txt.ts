import type { APIContext } from 'astro';

export const prerender = true;

const normalizeBase = (value: string) => (value.endsWith('/') ? value : `${value}/`);
const withBase = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBase(baseUrl);
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

export function GET(context: APIContext) {
  const baseUrl = import.meta.env.BASE_URL;
  const site = context.site ?? new URL('https://cdhxr.github.io');

  const sitemapIndex = new URL(withBase(baseUrl, '/sitemap-index.xml'), site).toString();

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemapIndex}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
