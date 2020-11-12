import mkdirp from 'mkdirp';
import Mimer from 'mimer';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import writeFiles from './writeFiles.js';
import { CONTENT_PATH, TOP_LEVEL_DIR, EVENT_DIR, eraseExistingFeeds } from './helpers.js';

const mime = Mimer();

export default function () {
    const mainDir = path.join(CONTENT_PATH, TOP_LEVEL_DIR, EVENT_DIR);
    const maxDate = moment().add(30, 'days');
    const upcoming = JSON.parse(
        fs.readFileSync(path.join(mainDir, 'source.json')),
    ).results.filter((i) => moment(i.date).isBefore(maxDate));
    const types = _.uniq(upcoming.map((i) => i.type.name).filter(Boolean)).sort();
    eraseExistingFeeds(EVENT_DIR, types);
    types.forEach((eventType) => {
        console.log(eventType);
        const items = upcoming
            .filter((i) => i.type.name === eventType)
            .map((item) => ({
                id: `${item.id}`,
                title: item.name,
                content_text: item.description,
                url: item.video_url || item.news_url || item.url,
                image: item.feature_image,
                date_published: item.date,
                date_modified: item.date,
                tags: [(item.type || {}).name].filter(Boolean).map((i) => _.snakeCase(i)),
                attachments: [item.feature_image].filter(Boolean).map((i) => ({
                    mime_type: mime.get(i),
                    url: i,
                })),
            }));
        // console.log(JSON.stringify(items, null, 4));
        mkdirp.sync(path.join(mainDir, _.snakeCase(eventType)));
        writeFiles({
            dirPath: path.join(TOP_LEVEL_DIR, EVENT_DIR, _.snakeCase(eventType)),
            name: 'original',
            feed: {
                version: null,
                feed_url: null,
                title: eventType,
                items,
            },
        });
    });
}
