require('dotenv').config();
const mongoose = require('mongoose');
const Grievance = require('./src/models/Grievance');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vamsiworkspace54_db_user:fFFXbSGICBaWnY7p@cluster0.zoko5u5.mongodb.net/punjab-government?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(`Connected to MongoDB.`);

        const result = await Grievance.deleteMany({
            'detected_location.keyword_matched': '#MandiCrisis'
        });

        console.log(`🗑️ Deleted ${result.deletedCount} grievances with #MandiCrisis.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
