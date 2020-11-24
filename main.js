#!/usr/bin/env node
import fs from "fs";
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import archiver from 'archiver';
import puppeteer from 'puppeteer';

import * as CONSTANTS from './constants.js';
import {scrape} from './scraper.js';
import {getFullDate, Logger} from './utils.js';

const argv = yargs(hideBin(process.argv))
    .options({
        's': {
            alias: 'start',
            demandOption: true,
            number: true,
            default: 1,
            describe: 'Index from which to start scrape data',
            nargs: 1,
        },
        'e': {
            alias: 'end',
            demandOption: true,
            number: true,
            default: CONSTANTS.MAX_RECORDS,
            describe: 'Index to end',
            nargs: 1,
        },
        'f': {
            alias: 'file',
            demandOption: true,
            type: 'string',
            default: CONSTANTS.FILE_TO_WRITE,
            describe: '.Json file to write',
            nargs: 1,
        },
    })
    .help('h')
    .argv


const compressImages = async (fullDate, logger) => {
    let zip_name = 'fpw_images_' + fullDate + '.zip'
    if (fs.existsSync(zip_name)) {
        zip_name = 'fpw_images_' + fullDate + '(1).zip'
    }
    if (!fs.existsSync('out/zips/')) {
        fs.mkdirSync('out/zips/');
    }

    let output = fs.createWriteStream('out/zips/' + zip_name);
    let archive = archiver('zip', {zlib: {level: 9}});

    output.on('close', function () {
        logger.log('Images zipped successfully to ' + zip_name);
        logger.log(archive.pointer() + ' total bytes.');
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory('images/', '.', null);

    await archive.finalize();
}


const launch = async (s, e) => {
    let amountOfRecords = e - s
    let interval = 1
    if (amountOfRecords > CONSTANTS.GAP) {
        interval = Math.ceil(amountOfRecords / CONSTANTS.GAP)
    }

    const fullDate = getFullDate()
    const logger = new Logger(CONSTANTS.DEBUG, fullDate)

    logger.log(interval + ' total iterations')

    let counter = 0
    let data = {}
    for (let j = 1; j <= interval; j++) {
        logger.log(j + ' -- iteration')
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            slowMo: 10,
            defaultViewport: null,
        });

        let first = s + (CONSTANTS.GAP * counter);
        if (counter !== 0) {
            first++;
        }
        if (first > CONSTANTS.MAX_RECORDS) {
            first = CONSTANTS.MAX_RECORDS;
        }

        let last = first + CONSTANTS.GAP;
        if (last > e) {
            last = e;
        }
        if (last > CONSTANTS.MAX_RECORDS) {
            last = CONSTANTS.MAX_RECORDS;
        }

        logger.log('Starting from ' + first + ' to ' + last);
        counter++;

        await scrape(first, last, browser, logger).then((value) => {
            logger.log(j + ' - iteration scraped, saving');
            Object.assign(data, value);
            let jsonData = JSON.stringify(data);
            if (!fs.existsSync('out/')) {
                fs.mkdirSync('out/');
            }
            fs.writeFile('out/' + fullDate + '_' + argv.f, jsonData, 'utf-8', (err) => {
                if (err) {
                    throw err;
                }
                logger.log("Data is saved successfully to " + fullDate + '_' + argv.f);
            });
        })
    }

    await compressImages(fullDate, logger);

}

await launch(argv.s, argv.e);
