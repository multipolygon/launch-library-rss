/* global process */

import dotenv from 'dotenv';
import fetchSpaceSchedule from './fetch.js';
import makeIndexes from './util/indexes.js';

dotenv.config();

async function run() {
    console.log('fetchSpaceSchedule...');
    await fetchSpaceSchedule();

    console.log('makeIndexes...');
    makeIndexes({
        contentPath: './feeds',
        contentHost: process.env.CONTENT_HOST,
        appHost: process.env.APP_HOST,
        buckets: ['queue', 'favourite', 'archive', 'original'],
    });

    return 'Done';
}

run().then(console.log).catch(console.error);
