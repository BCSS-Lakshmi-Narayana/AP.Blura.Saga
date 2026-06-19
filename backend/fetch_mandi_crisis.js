require('dotenv').config();
const mongoose = require('mongoose');
const { searchTweets } = require('./src/services/rapidApiXService');
const { createGrievanceFromPost, getNextSangrurAcByRoundRobin } = require('./src/services/grievanceService');
const Grievance = require('./src/models/Grievance');

/**
 * Special Script for #MandiCrisis
 * Fetches farmer-related problems and tags them specifically to Sangrur.
 */

const KEYWORD = "#MandiCrisis";
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vamsiworkspace54_db_user:fFFXbSGICBaWnY7p@cluster0.zoko5u5.mongodb.net/punjab-government?appName=Cluster0';

async function run() {
    try {
        console.log(`\n🚜 Starting Mandi Crisis Fetch for Sangrur`);
        console.log(`----------------------------------------`);
        
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`✅ Connected to MongoDB.`);

        // Fetch last 25 days of Mandi Crisis posts
        const date = new Date();
        date.setDate(date.getDate() - 25);
        const sinceDate = date.toISOString().split('T')[0];

        console.log(`Fetching tweets for "${KEYWORD}" since ${sinceDate}...`);
        const tweets = await searchTweets(KEYWORD, sinceDate);

        console.log(`Found ${tweets.length} tweets. Processing and Tagging to Sangrur...`);

        let newCount = 0;
        let skippedCount = 0;

        for (const tweet of tweets) {
            try {
                // Check if already exists
                const canonicalId = `x:keyword:${tweet.id}`;
                const existing = await Grievance.findOne({ tweet_id: canonicalId });
                
                if (existing) {
                    skippedCount++;
                    continue;
                }

                // Transform tweet into the format expected by createGrievanceFromPost
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

                // Create the grievance with FORCED Sangrur location
                const forceLocation = {
                    city: 'Sangrur',
                    district: 'Sangrur',
                    constituency: 'Sangrur',
                    source: 'forced_sangrur_mandi_crisis'
                };
                
                const grievance = await createGrievanceFromPost(post, 'x', KEYWORD, forceLocation);
                
                if (grievance) {
                    newCount++;
                    console.log(`[+] [SANGRUR] Created: ${grievance.id} | @${tweet.author_handle}`);
                } else {
                    skippedCount++;
                }
            } catch (err) {
                console.error(`❌ Error processing tweet ${tweet.id}: ${err.message}`);
            }
        }

        console.log(`\n📊 Mandi Crisis Fetch Complete!`);
        console.log(`- Total Found: ${tweets.length}`);
        console.log(`- New Tagged to Sangrur: ${newCount}`);
        console.log(`- Skipped (Existing): ${skippedCount}`);

        process.exit(0);
    } catch (error) {
        console.error(`\n❌ Script failed:`, error);
        process.exit(1);
    }
}

run();
