import fs from 'fs';

import {splitAndPrepare} from './utils.js';
import * as CONSTANTS from './constants.js';


export const scrape = async (start, end, browser, logger) => {

    const page = await browser.newPage();

    logger.log('Loading web page...');

    const userAgent =
        "Mozilla/5.0 (X11; Linux x86_64)" +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";
    await page.setUserAgent(userAgent);
    await page.goto(CONSTANTS.URL, {
        waitUntil: "networkidle0",
        timeout: 0
    });
    await page.waitForTimeout(3000);

    logger.log('Web page loaded')
    logger.log('Loading first record...')

    // Accept
    await page.click('#b0p0o3i0i0r1');
    await page.waitForTimeout(3000);

    // Go to first detailed record
    await page.click('#b0p1o11i0i0r1');
    await page.waitForTimeout(3000);
    logger.log('First record loaded')

    // go to specified record to start
    if (start !== 1 && start !== undefined && start !== null) {
        logger.log('Loading ' + start + ' record')
        await page.waitForSelector(CONSTANTS.SEARCH_RECORD_INPUT)
        await page.focus(CONSTANTS.SEARCH_RECORD_INPUT)
        await page.keyboard.press('Backspace');
        await page.keyboard.type(start.toString())
        await page.focus(CONSTANTS.FIRST_TAB)
        logger.log(start + ' record loaded')
    }

    logger.log('Scraping...')

    let result = {};
    let counter = 0;
    let skip_counter = 0;
    for (let i = start; i <= end; i++) {

        // go to first tab
        await page.click(CONSTANTS.FIRST_TAB);
        await page.waitForTimeout(CONSTANTS.TIMEOUT);

        try {
            let pageResult = await parsePage(page, logger)

            Object.assign(result, pageResult);

            counter++;
        } catch (e) {
            logger.log('Some error occurred on a record: ' + i);
            logger.log('Retrying record ' + i + ' ...');

            logger.log(e);

            try {
                // go to first tab
                await page.click(CONSTANTS.FIRST_TAB);
                await page.waitForTimeout(CONSTANTS.TIMEOUT);

                let pageResult = await parsePage(page, logger)

                Object.assign(result, pageResult);

                counter++;
            } catch (e) {
                logger.log('Unable to scrape record ' + i)
                logger.log('Skipping...')

                skip_counter++;

                logger.log(e);
            }
        }

        if (i !== end) {
            // go to next record page
            await page.click(CONSTANTS.NEXT_RECORD);
            await page.waitForTimeout(CONSTANTS.TIMEOUT);
        }
    }


    logger.log('Scraped ' + counter + ' records, from ' + start + ' to ' + end)
    logger.log('Skipped ' + skip_counter + ' records')
    logger.log('Saving data...')

    await browser.close();

    return result;
}

const parsePage = async (page, logger) => {
    await page.waitForSelector('#b0p1o9i0i0r1 > div > div.text');

    const firstTabData = await page.evaluate(() => {
        let description = document.querySelector('#b0p1o12i0i0r1 > div > div.text').innerText;
        let distribution = document.querySelector('#b0p1o14i0i0r1 > div > div.text').innerText;
        let ediblePortion = document.querySelector('#b0p1o9i0i0r1 > div > div.text').innerText;
        let family = document.querySelector('#b0p1o25i0i0r1 > div > div.text').innerText;
        let commonNames = document.querySelector('#b0p1o27i0i0r1 > div > div.text').innerText;
        let scientificName = document.querySelector('#b0p1o29i0i0r1 > div > div.text').innerText;

        return {
            description: description.trim(),
            distribution: distribution.trim(),
            edible_portion: ediblePortion,
            family: family.trim(),
            common_names: commonNames,
            scientific_name: scientificName.trim()
        }
    });

    firstTabData.edible_portion = splitAndPrepare(firstTabData.edible_portion, ',')
    firstTabData.common_names = splitAndPrepare(firstTabData.common_names, ',')

    // Go to second tab
    await page.click(CONSTANTS.SECOND_TAB);
    await page.waitForSelector('#b0p1o72i0i0r1 > div > div.text');

    const secondTabData = await page.evaluate(() => {
        let foundIn = document.querySelector('#b0p1o72i0i0r1 > div > div.text').innerText;

        return {
            foundIn,
        }
    });

    // Get origin country
    let originCountry = "";
    let foundInArr = secondTabData.foundIn.trim().split(',')
    let preparedFoundIn = [];
    for (let country of foundInArr) {
        if (country !== "") {
            if (country.includes('*')) {
                country = country.slice(0, -1).trim();
                originCountry = country
            }

            preparedFoundIn.push(country.trim());
        }
    }

    // Go to third tab
    await page.click(CONSTANTS.THIRD_TAB);
    await page.waitForSelector('#b0p1o88i0i0r1 > div > div.text');
    await page.waitForSelector('#b0p1o90i0i0r1 > div > div.text');
    await page.waitForSelector('#b0p1o92i0i0r1 > div > div.text');

    const thirdTabData = await page.evaluate(() => {
        let use = document.querySelector('#b0p1o88i0i0r1 > div > div.text').innerText;
        let cultivation = document.querySelector('#b0p1o90i0i0r1 > div > div.text').innerText;
        let production = document.querySelector('#b0p1o92i0i0r1 > div > div.text').innerText;
        return {
            use,
            cultivation: cultivation.trim(),
            production: production.trim(),
        }
    });

    thirdTabData.use = splitAndPrepare(thirdTabData.use, '.')

    await page.click(CONSTANTS.PHOTOS_TAB)
    try {
        // get first image
        const selector = "#b0p1o116i0i1r1 > div > div > img";
        await page.waitForTimeout(CONSTANTS.TIMEOUT)
        if (await page.$(selector) !== null) {
            await page.click(selector);
            await page.waitForSelector(CONSTANTS.IMAGE_SELECTOR);
            await page.waitForTimeout(CONSTANTS.TIMEOUT)

            // Get number of images for this record
            const data = await page.$eval(CONSTANTS.NUMBER_OF_PHOTOS, el => el.innerText);
            const numOfPhotos = data.trim().split('/', 1)

            // Download images
            for (let i = 1; i <= parseInt(numOfPhotos[0]); i++) {
                // select image
                await page.waitForSelector(CONSTANTS.IMAGE_SELECTOR);
                await page.focus(CONSTANTS.IMAGE_SELECTOR);
                await page.waitForTimeout(CONSTANTS.TIMEOUT)

                // get image element
                const imgElement = await page.$(CONSTANTS.IMAGE_SELECTOR);

                // wait for loading
                await page.waitForTimeout(CONSTANTS.TIMEOUT)

                // check whether directory exists and take screenshot of image
                let path = CONSTANTS.IMG_DIR + '/' + firstTabData.family + '/' + firstTabData.scientific_name;
                if (fs.existsSync(path)) {
                    await imgElement.screenshot({path: path + '/' + firstTabData.scientific_name + i + '.png'})
                } else {
                    fs.mkdirSync(path, {recursive: true});
                    await imgElement.screenshot({path: path + '/' + firstTabData.scientific_name + i + '.png'})
                }

                // Next image
                try {
                    await page.waitForSelector("#b0p0o21i0i0r1");
                    await page.click("#b0p0o21i0i0r1")
                } catch (e) {
                    logger.log(e);
                }
            }

            // Back to record
            await page.waitForSelector("#b0p0o15i0i0r1")
            await page.click("#b0p0o15i0i0r1")
        }
    } catch (e) {
        logger.log('No image found, skipping...');
        logger.log(e);

        // try to return back
        try {
            await page.waitForSelector("#b0p0o15i0i0r1")
            await page.click("#b0p0o15i0i0r1")
        } catch (e) {
            logger.log(e);
        }
    }

    // Go to last tab
    await page.waitForSelector(CONSTANTS.LAST_TAB)
    await page.click(CONSTANTS.LAST_TAB);
    await page.waitForTimeout(CONSTANTS.TIMEOUT);
    await page.waitForSelector('#b0p1o77i0i0r1 > div > div.text');
    await page.waitForSelector('#b0p1o74i0i0r1 > div > div.text');

    const lastTabData = await page.evaluate(() => {
        let otherNames = document.querySelector('#b0p1o77i0i0r1 > div > div.text').innerText;
        let synonyms = document.querySelector('#b0p1o74i0i0r1 > div > div.text').innerText;

        return {
            other_names: otherNames,
            synonyms
        }
    });

    lastTabData.other_names = splitAndPrepare(lastTabData.other_names, ',')
    lastTabData.synonyms = splitAndPrepare(lastTabData.synonyms, ';')

    return {
        [firstTabData.scientific_name.trim()]: {
            ...firstTabData,
            found_in: preparedFoundIn,
            ...thirdTabData,
            ...lastTabData,
            origin_country: originCountry
        }
    };
}
