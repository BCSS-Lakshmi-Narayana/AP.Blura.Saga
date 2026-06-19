require('dotenv').config();
const mongoose = require('mongoose');
const { searchTweets } = require('./src/services/rapidApiXService');
const { createGrievanceFromPost } = require('./src/services/grievanceService');
const Grievance = require('./src/models/Grievance');

const KEYWORD = "#sangrurnews";
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vamsiworkspace54_db_user:fFFXbSGICBaWnY7p@cluster0.zoko5u5.mongodb.net/punjab-government?appName=Cluster0';

async function run() {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`Connected to MongoDB.`);

        // Calculate since date (2 months ago)
        const date = new Date();
        date.setMonth(date.getMonth() - 2);
        const sinceDate = date.toISOString().split('T')[0];

        console.log(`Fetching tweets for "${KEYWORD}" since ${sinceDate}...`);
        const tweets = await searchTweets(KEYWORD, sinceDate);

        console.log(`Found ${tweets.length} tweets. Processing...`);

        let newCount = 0;
        let skippedCount = 0;

        for (const tweet of tweets) {
            try {
                // Check if already exists (using x:keyword:ID format which is used in createGrievanceFromPost)
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

                const result = await createGrievanceFromPost(post, 'x', KEYWORD);
                if (result) {
                    newCount++;
                    console.log(`[+] Created grievance: ${result.id} | ${tweet.author_handle}`);
                } else {
                    skippedCount++;
                }
            } catch (err) {
                console.error(`Error processing tweet ${tweet.id}: ${err.message}`);
            }
        }

        console.log(`\nFetch Complete!`);
        console.log(`Total Found: ${tweets.length}`);
        console.log(`New Created: ${newCount}`);
        console.log(`Skipped (Existing): ${skippedCount}`);

        process.exit(0);
    } catch (error) {
        console.error(`Script failed:`, error);
        process.exit(1);
    }
}

run();
