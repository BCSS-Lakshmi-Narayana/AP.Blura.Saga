/**
 * fetch_tdp_rss.js
 * ─────────────────────────────────────────────────────────────────────
 * Fetches RSS feed news articles strictly about Andhra Pradesh politics.
 * Supports date ranges (e.g. Feb and March 2026 using --feb-march).
 * Queries multiple Google News feeds to get up to 300 raw articles,
 * merges, and deduplicates them.
 * Resolves redirect URLs to get original URLs and extracts preview
 * images and summaries from article metadata.
 * Accumulates articles in the database (does not clear old records).
 * Ensures 100% of stored articles have a valid original preview image.
 *
 * Usage:
 *   node backend/scripts/fetch_tdp_rss.js              # Fetch current
 *   node backend/scripts/fetch_tdp_rss.js --feb-march  # Fetch Feb & March 2026
 *   node backend/scripts/fetch_tdp_rss.js --dry-run    # Fetch and print
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleDecoder } = require('google-news-url-decoder');
const connectDB = require('../src/config/db');
const NewsArticle = require('../src/models/NewsArticle');

const DRY_RUN = process.argv.includes('--dry-run');
const FEB_MARCH = process.argv.includes('--feb-march');

// Query multiple Google News feeds for comprehensive coverage
const RSS_FEED_URLS = FEB_MARCH ? [
  'https://news.google.com/rss/search?q=%22Andhra+Pradesh+politics%22+OR+TDP+OR+YSRCP+OR+%22Jana+Sena%22+after:2026-02-01+before:2026-04-01&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=%22Chandrababu+Naidu%22+OR+%22YS+Jagan%22+OR+%22Pawan+Kalyan%22+OR+%22Lokesh+Nara%22+after:2026-02-01+before:2026-04-01&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=Amaravati+OR+%22Andhra+governance%22+OR+%22Andhra+Assembly%22+after:2026-02-01+before:2026-04-01&hl=en-IN&gl=IN&ceid=IN:en'
] : [
  'https://news.google.com/rss/search?q=%22Andhra+Pradesh+politics%22+OR+TDP+OR+YSRCP+OR+%22Jana+Sena%22&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=%22Chandrababu+Naidu%22+OR+%22YS+Jagan%22+OR+%22Pawan+Kalyan%22+OR+%22Lokesh+Nara%22&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=Amaravati+OR+%22Andhra+governance%22+OR+%22Andhra+Assembly%22+OR+%22Andhra+elections%22&hl=en-IN&gl=IN&ceid=IN:en'
];

const decoder = new GoogleDecoder();

async function resolveRedirect(url) {
  try {
    const decoded = await decoder.decode(url);
    if (decoded && decoded.status) {
      return decoded.decoded_url;
    }
  } catch (e) {
    console.error(`  Warning: Failed to decode URL ${url} using decoder. Falling back to HTTP response.`);
  }
  
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return res.request.res.responseUrl || url;
  } catch (error) {
    return url;
  }
}

async function scrapePreviewImage(url, title = '') {
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    
    // 1. Try meta tags
    let imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('meta[property="twitter:image"]').attr('content') ||
                   $('link[rel="image_src"]').attr('href');

    // 2. Fallback: Check for img tag with alt text matching the article title words
    if (!imageUrl && title) {
      const cleanTitle = title.split(' - ')[0].split(' | ')[0]; // strip source suffixes
      const titleWords = cleanTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      $('img').each((i, el) => {
        const alt = ($(el).attr('alt') || '').toLowerCase();
        const src = $(el).attr('src');
        if (src && alt && titleWords.some(word => alt.includes(word))) {
          if (!src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('emblem')) {
            imageUrl = src;
            return false; // break loop
          }
        }
      });
    }

    // 3. Fallback: Grab the first image from common article body/content selectors
    if (!imageUrl) {
      const articleImg = $('article img, .post-content img, .entry-content img, .main-content img, .story-content img').first().attr('src');
      if (articleImg) {
        imageUrl = articleImg;
      }
    }

    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const parsedUrl = new URL(url);
        imageUrl = new URL(imageUrl, parsedUrl.origin).href;
      } catch (e) {
        imageUrl = null;
      }
    }

    // Clean image check: only check the filename
    if (imageUrl) {
      let filename = '';
      try {
        filename = new URL(imageUrl).pathname.split('/').pop().toLowerCase();
      } catch (e) {
        filename = imageUrl.toLowerCase();
      }

      if (filename && (
        filename.includes('logo') ||
        filename.includes('avatar') ||
        filename.includes('icon') ||
        filename.includes('default') ||
        filename.includes('placeholder') ||
        filename.includes('emblem')
      )) {
        imageUrl = null;
      }
    }

    return imageUrl || null;
  } catch (error) {
    return null;
  }
}

async function run() {
  console.log(`Fetching multiple RSS feeds (FEB_MARCH: ${FEB_MARCH})...`);
  const allItemsMap = new Map();

  for (const feedUrl of RSS_FEED_URLS) {
    try {
      const response = await axios.get(feedUrl);
      const $ = cheerio.load(response.data, { xmlMode: true });
      $('item').each((i, el) => {
        const title = $(el).find('title').text();
        const link = $(el).find('link').text();
        const pubDate = $(el).find('pubDate').text();
        const source = $(el).find('source').text();
        const description = $(el).find('description').text();
        if (link && !allItemsMap.has(link)) {
          allItemsMap.set(link, { title, link, pubDate, source, description });
        }
      });
    } catch (error) {
      console.error(`Error fetching RSS feed (${feedUrl}):`, error.message);
    }
  }

  const items = Array.from(allItemsMap.values());
  const maxItemsToProcess = Math.min(items.length, 180);
  console.log(`Found ${items.length} unique items across all feeds. Processing up to ${maxItemsToProcess}...`);

  if (!DRY_RUN) {
    await connectDB();
    console.log('Ingesting new RSS articles (duplicates will be skipped)...');
  }

  let successCount = 0;
  let skippedDuplicates = 0;

  for (let i = 0; i < maxItemsToProcess; i++) {
    const item = items[i];
    const { title, link: googleNewsUrl, pubDate: pubDateStr, source: sourceName, description } = item;

    const lowerTitle = title.toLowerCase();
    const isAboutApPolitics = lowerTitle.includes('tdp') || 
                              lowerTitle.includes('telugu desam') || 
                              lowerTitle.includes('chandrababu') || 
                              lowerTitle.includes('lokesh') || 
                              lowerTitle.includes('jagan') ||
                              lowerTitle.includes('ysrcp') ||
                              lowerTitle.includes('pawan') ||
                              lowerTitle.includes('jana sena') ||
                              lowerTitle.includes('andhra') ||
                              lowerTitle.includes('mudragada');

    if (!isAboutApPolitics) {
      console.log(`\n[Skipping] "${title}" (Does not match AP politics keywords)`);
      continue;
    }

    console.log(`\n[${i + 1}/${maxItemsToProcess}] Resolving redirect for: "${title}"`);
    const directUrl = await resolveRedirect(googleNewsUrl);
    console.log(`  -> Direct URL: ${directUrl}`);

    let domain = '';
    try {
      domain = new URL(directUrl).hostname.replace('www.', '');
    } catch (e) {
      domain = 'unknown';
    }

    if (['indianexpress.com', 'news.google.com'].includes(domain)) {
      console.log(`  Skipping excluded domain: ${domain}`);
      continue;
    }

    // Clean description/summary text from RSS tag
    let summaryText = '';
    if (description) {
      try {
        const $desc = cheerio.load(description);
        summaryText = $desc.text().trim();
        const suffixIndex = summaryText.indexOf('and more&nbsp;»');
        if (suffixIndex !== -1) {
          summaryText = summaryText.substring(0, suffixIndex).trim();
        }
        if (summaryText.length > 250) {
          summaryText = summaryText.substring(0, 247) + '...';
        }
      } catch (e) {
        summaryText = '';
      }
    }

    if (!DRY_RUN) {
      const existing = await NewsArticle.findOne({ source_url: directUrl });
      if (existing) {
        if (!existing.summary && summaryText) {
          existing.summary = summaryText;
          await existing.save();
          console.log('  Article exists in DB. Updated missing summary text.');
        } else {
          console.log('  Article already exists in DB. Skipping scraper.');
        }
        skippedDuplicates++;
        continue;
      }
    }

    console.log('  Scraping page for preview image...');
    const imageUrl = await scrapePreviewImage(directUrl, title);
    console.log(`  -> Extracted Image URL: ${imageUrl}`);

    if (!imageUrl) {
      console.log('  Skipping article: No valid preview image found.');
      continue;
    }

    if (DRY_RUN) {
      console.log('  [Dry Run] Scraped article details:', {
        title,
        source_url: directUrl,
        source_name: sourceName,
        source_domain: domain,
        image_url: imageUrl,
        published_date: pubDateStr ? new Date(pubDateStr) : new Date(),
        source_type: 'rss',
        summary: summaryText
      });
      successCount++;
    } else {
      try {
        await NewsArticle.create({
          title,
          source_url: directUrl,
          source_name: sourceName,
          source_domain: domain,
          image_url: imageUrl,
          published_date: pubDateStr ? new Date(pubDateStr) : new Date(),
          source_type: 'rss',
          category: 'politics',
          summary: summaryText,
          content: summaryText,
          keywords_matched: ['Andhra Pradesh Politics', 'TDP']
        });
        console.log('  Successfully saved to DB!');
        successCount++;
      } catch (err) {
        console.error('  Failed to save article:', err.message);
      }
    }
  }

  console.log(`\nFinished processing. New articles added: ${successCount}. Skipped/Updated: ${skippedDuplicates}.`);
  if (!DRY_RUN) {
    mongoose.connection.close();
  }
}

run();
