#!/usr/bin/env node
import fs from "fs";
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import archiver from 'archiver';

import * as CONSTANTS from './constants.js';
import {scrape} from './scraper.js';

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

scrape(argv.s, argv.e).then((value) => {
    const data = JSON.stringify(value);

    fs.writeFile(argv.f, data, 'utf-8',(err) => {
        if (err) {
            throw err;
        }
        console.log("Data is saved successfully to " + argv.f);
    });

    let output = fs.createWriteStream('fpw_images.zip');
    let archive = archiver('zip', {zlib: {level: 9}});

    output.on('close', function() {
        console.log('Images zipped successfully to fpw_images.zip');
        console.log(archive.pointer() + ' total bytes.');
    });

    archive.on('error', function(err){
        throw err;
    });

    archive.pipe(output);
    archive.directory('images/', '.', null);

    archive.finalize();
});
