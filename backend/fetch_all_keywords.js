require('dotenv').config();
const mongoose = require('mongoose');
const { searchTweets } = require('./src/services/rapidApiXService');
const { createGrievanceFromPost } = require('./src/services/grievanceService');
const Grievance = require('./src/models/Grievance');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vamsiworkspace54_db_user:fFFXbSGICBaWnY7p@cluster0.zoko5u5.mongodb.net/punjab-government?appName=Cluster0';

// Keywords and handles to fetch
// #MandiCrisis gets special treatment: forced Sangrur location (same as fetch_mandi_crisis.js)
const KEYWORDS = [
    { query: '#sangrurnews',    forcedLocation: null },
    { query: '#sangrur',        forcedLocation: null },
    { query: '#CMBhagwantMann', forcedLocation: null },
    { query: '@HarsimratBadal_',forcedLocation: null },
    { query: '@bsmajithia',     forcedLocation: null },
    { query: '@BhagwantMann',   forcedLocation: null },
    {
        query: '#MandiCrisis',
        forcedLocation: {
            city: 'Sangrur',
            district: 'Sangrur',
            constituency: 'Sangrur',
            source: 'forced_sangrur_mandi_crisis'
        }
    },
];

// How many days back to fetch (change this if needed)
const DAYS_BACK = 25;

async function fetchKeyword({ query, forcedLocation }) {
    const date = new Date();
    date.setDate(date.getDate() - DAYS_BACK);
    const sinceDate = date.toISOString().split('T')[0];

    console.log(`\n[${query}] Fetching since ${sinceDate}...`);
    const tweets = await searchTweets(query, sinceDate);
    console.log(`[${query}] Found ${tweets.length} tweets.`);

    let newCount = 0;
    let skippedCount = 0;

    for (const tweet of tweets) {
        try {
            const canonicalId = `x:keyword:${tweet.id}`;
            const existing = await Grievance.findOne({ tweet_id: canonicalId });

            if (existing) {
                skippedCount++;
                continue;
            }

            const post = {
                tweet_id: canonicalId,
                text: tweet.text,
                url: tweet.url,
                created_at: tweet.created_at,
                author: {
                    handle: tweet.author_handle,
                    display_name: tweet.author,
                    profile_image_url: tweet.author_avatar,
                    location: tweet.author_location,
                    bio: tweet.author_bio,
                    is_verified: tweet.verified,
                    follower_count: 0
                },
                media: tweet.media || [],
                engagement: {
                    likes: parseInt(tweet.metrics?.like) || 0,
                    retweets: parseInt(tweet.metrics?.retweet) || 0,
                    replies: parseInt(tweet.metrics?.reply) || 0,
                    views: parseInt(tweet.metrics?.views) || 0,
                    quotes: parseInt(tweet.metrics?.quote) || 0
                }
            };

            const grievance = await createGrievanceFromPost(post, 'x', query, forcedLocation || undefined);

            if (grievance) {
                newCount++;
                const tag = forcedLocation ? `[${forcedLocation.city}] ` : '';
                console.log(`  [+] ${tag}Created: ${grievance.id} | @${tweet.author_handle}`);
            } else {
                skippedCount++;
            }
        } catch (err) {
            console.error(`  [!] Error processing tweet ${tweet.id}: ${err.message}`);
        }
    }

    return { query, total: tweets.length, newCount, skippedCount };
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.\n');

        const summary = [];

        for (const kw of KEYWORDS) {
            const result = await fetchKeyword(kw);
            summary.push(result);
        }

        console.log('\n========== FETCH SUMMARY ==========');
        for (const s of summary) {
            console.log(`${s.query.padEnd(22)} | Found: ${String(s.total).padStart(3)} | New: ${String(s.newCount).padStart(3)} | Skipped: ${s.skippedCount}`);
        }
        console.log('====================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

run();
