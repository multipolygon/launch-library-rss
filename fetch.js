import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { CONTENT_PATH, TOP_LEVEL_DIR, LAUNCH_DIR, EVENT_DIR } from './util/helpers.js';
import launchSplitter from './util/launch.js';
import eventSplitter from './util/event.js';

async function fetchSync(feedName, src) {
    return new Promise((resolve) =>
        fetch(src, {
            headers: {
                'User-Agent': 'github.com/multipolygon/launch-library-rss',
            },
        })
            .then((response) => {
                if (response.ok) {
                    response
                        .json()
                        .then((data) => {
                            fs.writeFileSync(
                                path.join(CONTENT_PATH, TOP_LEVEL_DIR, feedName, `source.json`),
                                JSON.stringify(data, null, 4),
                            );

                            resolve();
                        })
                        .catch(() => {
                            console.error('DATA ERROR', feedName);
                            resolve();
                        });
                } else {
                    console.error('FAIL', response.status, feedName);
                    resolve();
                }
            })
            .catch(() => {
                console.error('REQUEST ERROR', feedName);
                resolve();
            }),
    );
}

export default async function main() {
    console.log('...launch...');
    await fetchSync(LAUNCH_DIR, 'https://ll.thespacedevs.com/2.0.0/launch/upcoming.json?status=1');
    launchSplitter();
    console.log('...event...');
    await fetchSync(EVENT_DIR, 'https://ll.thespacedevs.com/2.0.0/event/upcoming.json');
    eventSplitter();
    return 'done';
}
