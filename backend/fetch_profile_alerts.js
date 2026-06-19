require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { scanSourceOnce } = require('./src/services/monitorService');
const Source = require('./src/models/Source');
const Content = require('./src/models/Content');
const Alert = require('./src/models/Alert');

/**
 * End-to-End Profile Fetching & Analysis Script
 * Usage: node fetch_profile_alerts.js <handle>
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vamsiworkspace54_db_user:fFFXbSGICBaWnY7p@cluster0.zoko5u5.mongodb.net/punjab-government?appName=Cluster0';

async function run() {
    const handle = process.argv[2];
    if (!handle) {
        console.error('❌ Error: Please provide a profile handle (e.g., @bsmajithia)');
        process.exit(1);
    }

    const cleanHandle = handle.replace('@', '').trim();

    try {
        console.log(`\n🚀 Starting End-to-End Fetch for: @${cleanHandle}`);
        console.log(`--------------------------------------------------`);
        
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`✅ Connected to MongoDB.`);

        // 1. Ensure Source exists
        let source = await Source.findOne({ 
            identifier: { $regex: new RegExp(`^${cleanHandle}$`, 'i') }, 
            platform: 'x' 
        });

        if (!source) {
            console.log(`[+] Source not found. Creating new source for @${cleanHandle}...`);
            source = new Source({
                id: uuidv4(),
                identifier: cleanHandle,
                display_name: cleanHandle,
                platform: 'x',
                is_active: true,
                category: 'monitored_profile',
                priority: 'medium',
                created_by: 'system',
                added_at: new Date()
            });
            await source.save();
            console.log(`✅ Source created: ${source.id}`);
        } else {
            console.log(`✅ Existing source found: ${source.display_name} (${source.id})`);
            // Ensure it's active
            if (!source.is_active) {
                source.is_active = true;
                await source.save();
                console.log(`[!] Reactivated source.`);
            }
        }

        // 2. Trigger Scan (Fetch -> Analyze -> Alert)
        console.log(`\n🔍 Scanning profile content... (This involves LLM analysis)`);
        const result = await scanSourceOnce(source, { days: 30, limit: 100 });
        
        console.log(`\n📊 Scan Summary:`);
        console.log(`- Items Scanned: ${result.scanned || 0}`);
        console.log(`- Items Ingested: ${result.ingested || 0}`);

        // 3. Verify Alerts
        // We look for alerts created in the last few minutes for this handle
        const recentAlerts = await Alert.find({
            author_handle: { $regex: new RegExp(`^${cleanHandle}$`, 'i') },
            created_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        }).sort({ created_at: -1 });

        if (recentAlerts.length > 0) {
            console.log(`\n🔔 Alerts Generated: ${recentAlerts.length}`);
            recentAlerts.forEach((alert, i) => {
                console.log(`   ${i+1}. [${alert.risk_level.toUpperCase()}] ${alert.title}`);
                console.log(`      Type: ${alert.alert_type}`);
                console.log(`      URL: ${alert.content_url}`);
                console.log(`      ---`);
            });
        } else {
            console.log(`\n⚪ No new risk-based alerts triggered for the latest posts.`);
        }

        console.log(`\n✅ End-to-End process complete for @${cleanHandle}.\n`);
        process.exit(0);
    } catch (error) {
        console.error(`\n❌ Script failed:`, error);
        process.exit(1);
    }
}

run();
