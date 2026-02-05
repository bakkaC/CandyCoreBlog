import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export const prerender = true;

const normalizeBase = (value: string) => (value.endsWith('/') ? value : `${value}/`);
const withBase = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBase(baseUrl);
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

type FeedItem = {
  title: string;
  description?: string;
  link: string;
  pubDate?: Date;
  categories?: string[];
};

export async function GET(context: APIContext) {
  const baseUrl = import.meta.env.BASE_URL;

  const [notes, thoughts, blogs] = await Promise.all([
    getCollection('notes'),
    getCollection('thoughts'),
    getCollection('blogs'),
  ]);

  const items: FeedItem[] = [
    ...notes.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/notes/${entry.slug}`),
      pubDate: entry.data.date,
      categories: entry.data.tags,
    })),
    ...thoughts.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/thoughts/${entry.slug}`),
      pubDate: entry.data.date,
      categories: entry.data.tags,
    })),
    ...blogs.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/blog/${entry.slug}`),
      pubDate: entry.data.date,
      categories: entry.data.tags,
    })),
  ].sort((a, b) => {
    const aTime = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const bTime = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return bTime - aTime;
  });

  return rss({
    title: "CdCore's Blog",
    description: '记录前端开发、工程实践与随想杂记',
    site: context.site ?? new URL('https://cdhxr.github.io'),
    items: items.map((item) => ({
      title: item.title,
      description: item.description ?? '',
      link: item.link,
      pubDate: item.pubDate ?? new Date(),
      categories: item.categories ?? [],
    })),
    customData: `<language>zh-cn</language>`,
  });
}
