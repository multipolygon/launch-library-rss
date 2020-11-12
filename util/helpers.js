import glob from 'glob';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import writeFiles from './writeFiles.js';

export const CONTENT_PATH = path.join('.', 'feeds');
export const TOP_LEVEL_DIR = 'space-schedule';
export const LAUNCH_DIR = 'launch';
export const EVENT_DIR = 'event';

export function eraseExistingFeeds(dir, activeFeeds) {
    const mainDir = path.join(CONTENT_PATH, TOP_LEVEL_DIR, dir);
    _.without(
        glob
            .sync('*', { cwd: mainDir })
            .filter((i) => fs.lstatSync(path.join(mainDir, i)).isDirectory()),
        activeFeeds.map((i) => _.snakeCase(i)),
    ).forEach((existing) =>
        writeFiles({
            dirPath: path.join(TOP_LEVEL_DIR, dir, existing),
            name: 'original',
            feed: {
                version: null,
                feed_url: null,
                title: _.startCase(existing),
                items: [],
            },
        }),
    );
}
