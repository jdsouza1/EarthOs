import type { MetadataRoute } from 'next';

/**
 * The site is public and free to reuse, so every crawler is allowed, including AI assistants
 * that fetch a page when someone asks them to read it. Stated explicitly because some fetchers
 * treat a missing robots.txt as a refusal.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
    ],
  };
}
