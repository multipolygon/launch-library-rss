import mkdirp from 'mkdirp';
import Mimer from 'mimer';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import writeFiles from './writeFiles.js';
import { CONTENT_PATH, TOP_LEVEL_DIR, LAUNCH_DIR, eraseExistingFeeds } from './helpers.js';

const mime = Mimer();

export default function () {
    const mainDir = path.join(CONTENT_PATH, TOP_LEVEL_DIR, LAUNCH_DIR);
    const maxDate = moment().add(30, 'days');
    const upcoming = JSON.parse(
        fs.readFileSync(path.join(mainDir, 'source.json')),
    ).results.filter((i) => moment(i.window_start).isBefore(maxDate));
    const providers = _.uniq(
        upcoming.map((i) => i.launch_service_provider.name).filter(Boolean),
    ).sort();
    eraseExistingFeeds(LAUNCH_DIR, providers);
    providers.forEach((provider) => {
        console.log(provider);
        const items = upcoming
            .filter((i) => i.launch_service_provider.name === provider)
            .map((item) => ({
                id: item.id,
                title: item.name,
                content_text:
                    [
                        (item.mission || {}).description,
                        item.vidURLs && `Video: ${item.vidURLs.map((i) => ` - ${i}`).join('\n')}`,
                        item.infoURLs && `Info: ${item.infoURLs.map((i) => ` - ${i}`).join('\n')}`,
                    ]
                        .filter(Boolean)
                        .join('\n') || '-',
                url:
                    (item.vidURLs && item.vidURLs[0]) ||
                    (item.infoURLs && item.infoURLs[0]) ||
                    item.url,
                image: item.image,
                date_published: item.window_start,
                date_modified: item.window_start,
                tags: [
                    (item.launch_service_provider || {}).type,
                    ((item.rocket || {}).configuration || {}).family,
                    ((item.rocket || {}).configuration || {}).name,
                    (item.mission || {}).type,
                    (item.pad || {}).name,
                    (item.pad || {}).country_code,
                    ...(item.program || []).map((i) => _.snakeCase(i)),
                ]
                    .filter(Boolean)
                    .map((i) => i.toLowerCase()),
                attachments: [item.image].filter(Boolean).map((i) => ({
                    mime_type: mime.get(i),
                    url: i,
                })),
            }));
        // console.log(JSON.stringify(items, null, 4));
        mkdirp.sync(path.join(mainDir, _.snakeCase(provider)));
        writeFiles({
            dirPath: path.join(TOP_LEVEL_DIR, LAUNCH_DIR, _.snakeCase(provider)),
            name: 'original',
            feed: {
                version: null,
                feed_url: null,
                title: provider,
                items,
            },
        });
    });
}
