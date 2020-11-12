/* global URL URLSearchParams */

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import glob from 'glob';
import dotenv from 'dotenv';
import writeFiles from './writeFiles.js';
import omitNull from './omitNull.js';

dotenv.config();

const getFirst = (ary, prop) => {
    try {
        return ary.filter((x) => x[prop])[0][prop];
    } catch (e) {
        return null;
    }
};

const average = (ary) => ary.reduce((a, b) => a + b, 0) / ary.length;

const coord = (ary) =>
    ary.reduce((acc, val) => acc && Boolean(parseFloat(val)), true)
        ? ary.map((v) => Math.round(parseFloat(v) * 1000) / 1000)
        : null;

const averageCoord = (items) => {
    const coordAry = items
        .filter((i) => i._geo)
        .map((i) => i._geo.coordinates)
        .filter(Boolean);
    return coord([average(coordAry.map((i) => i[0])), average(coordAry.map((i) => i[1]))]);
};

export default function ({ contentPath, contentHost, appHost, buckets }) {
    function makeIndexFeeds({ inFilePaths, title, description, name, dirPath }) {
        const feed = {
            title: _.upperFirst(title),
            description,
            items: inFilePaths.reduce((acc, indexPath) => {
                // console.log(' ->', indexPath);
                const bucketFeed = JSON.parse(fs.readFileSync(indexPath));
                if (bucketFeed.items.length !== 0) {
                    const url = new URL(appHost);
                    url.search = new URLSearchParams({
                        i: bucketFeed.feed_url.replace(contentHost, './'),
                    });
                    return [
                        ...acc,
                        omitNull({
                            id: bucketFeed.feed_url,
                            url: url.href,
                            title: bucketFeed.title,
                            content_text: `${bucketFeed.items.length} items`,
                            image: getFirst(bucketFeed.items, 'image') || bucketFeed.icon,
                            date_published: getFirst(bucketFeed.items, 'date_published'),
                            date_modified: getFirst(bucketFeed.items, 'date_published'),
                            _geo: omitNull({
                                coordinates: averageCoord(bucketFeed.items),
                            }),
                            _meta: {
                                itemCount: bucketFeed.items.length,
                                audioCount: _.sumBy(bucketFeed.items, '_meta.audioCount'),
                                videoCount: _.sumBy(bucketFeed.items, '_meta.videoCount'),
                                imageCount: _.sumBy(bucketFeed.items, '_meta.imageCount'),
                            },
                        }),
                    ];
                }
                return acc;
            }, []),
        };

        // console.log('   ---->', feed.items.length);

        writeFiles({
            dirPath,
            name: `${name}_index`,
            feed,
            contentPath,
            contentHost,
            appHost,
        });

        return feed;
    }

    function globalId(url, id) {
        return [...path.dirname(new URL(url).pathname).split('/'), id].join('~');
    }

    function makeCombinedFeeds({ inFilePaths, title, description, name, dirPath }) {
        const feed = {
            title: _.upperFirst(title),
            description,
            items: inFilePaths.reduce((acc, indexPath) => {
                // console.log(' ->', indexPath);
                const bucketFeed = JSON.parse(fs.readFileSync(indexPath));
                if (bucketFeed.items.length !== 0) {
                    return [
                        ...acc,
                        ...bucketFeed.items.map((i) => ({
                            ...i,
                            id: (i._id && i._id.global) || globalId(bucketFeed.feed_url, i.id),
                            _id: {
                                parent: i.id,
                                global: globalId(bucketFeed.feed_url, i.id),
                                ...(i._id || {}),
                            },
                            _feed_url: {
                                parent: (i._feed_url && i._feed_url.parent) || bucketFeed.feed_url,
                            },
                            image: i.image || bucketFeed.icon,
                            _meta: {
                                ...(i._meta || {}),
                                subtitle: (i._meta && i._meta.subtitle) || bucketFeed.title,
                                audioCount:
                                    i.attachments &&
                                    i.attachments.filter((a) => /^audio\//.test(a.mime_type))
                                        .length,
                                videoCount:
                                    ((i.attachments &&
                                        i.attachments.filter((a) => /^video\//.test(a.mime_type))
                                            .length) ||
                                        0) + (i._youtube ? 1 : 0),
                                imageCount:
                                    i.attachments &&
                                    i.attachments.filter((a) => /^image\//.test(a.mime_type))
                                        .length,
                            },
                        })),
                    ];
                }
                return acc;
            }, []),
        };

        // console.log('   ---->', feed.items.length);

        writeFiles({
            dirPath,
            name,
            feed,
            contentPath,
            contentHost,
            appHost,
        });

        return feed;
    }

    /// /////////////////////////////////////////////////////////////////////////////////////////////////

    function subCategoryIndexes(bucket) {
        for (const dirPath of glob.sync(path.join('*', '*'), { cwd: contentPath })) {
            if (fs.lstatSync(path.join(contentPath, dirPath)).isDirectory()) {
                // console.log(dirPath);
                makeIndexFeeds({
                    inFilePaths: glob.sync(path.join(contentPath, dirPath, '*', `${bucket}.json`)),
                    title: path.basename(dirPath),
                    description: `All feeds in ${dirPath
                        .split(path.sep)
                        .map(_.startCase)
                        .join(' > ')}.`,
                    name: bucket,
                    dirPath,
                });
                makeCombinedFeeds({
                    inFilePaths: glob.sync(path.join(contentPath, dirPath, '*', `${bucket}.json`)),
                    title: path.basename(dirPath),
                    description: `All items in ${dirPath
                        .split(path.sep)
                        .map(_.startCase)
                        .join(' > ')}.`,
                    name: bucket,
                    dirPath,
                });
            }
        }
    }

    function categoryIndexes(bucket) {
        for (const dirPath of glob.sync(path.join('*'), { cwd: contentPath })) {
            if (fs.lstatSync(path.join(contentPath, dirPath)).isDirectory()) {
                // console.log(dirPath);
                makeIndexFeeds({
                    inFilePaths: glob.sync(
                        path.join(contentPath, dirPath, '*', `${bucket}_index.json`),
                    ),
                    title: dirPath,
                    description: 'All subcategories in category.',
                    name: bucket,
                    dirPath,
                });
                makeCombinedFeeds({
                    inFilePaths: glob.sync(path.join(contentPath, dirPath, '*', `${bucket}.json`)),
                    title: dirPath,
                    description: 'All items in subcategories for category.',
                    name: bucket,
                    dirPath,
                });
            }
        }
    }

    function mainIndexes(bucket) {
        // console.log(contentPath);
        // console.log(bucket);
        makeIndexFeeds({
            inFilePaths: glob.sync(path.join(contentPath, '*', `${bucket}_index.json`)),
            title: 'Index',
            description: 'All categories.',
            name: bucket,
            dirPath: '.',
        });
        makeCombinedFeeds({
            inFilePaths: glob.sync(path.join(contentPath, '*', `${bucket}.json`)),
            title: 'All Items',
            description: 'All items.',
            name: bucket,
            dirPath: '.',
        });
    }

    buckets.forEach((bucket) => {
        // console.log('----', bucket, '----');
        subCategoryIndexes(bucket);
        categoryIndexes(bucket);
        mainIndexes(bucket);
    });
}
