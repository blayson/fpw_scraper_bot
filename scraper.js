import puppeteer from 'puppeteer';

import {splitAndPrepare} from './utils.js';
import * as CONSTANTS from './constants.js';

export const scrape = async (start, end) => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    console.log('Loading web page...')

    await page.goto(CONSTANTS.URL);
    await page.waitForTimeout(5000);
    console.log('Web page loaded')
    console.log('Loading first record...')

    // Accept
    await page.click('#b0p0o3i0i0r1');
    await page.waitForTimeout(5000);

    // Go to first detailed record
    await page.click('#b0p1o11i0i0r1');
    await page.waitForTimeout(5000);

    if (start !== 1 && start !== undefined && start !== null) {
        await page.waitForSelector(CONSTANTS.SEARCH_RECORD_INPUT)
        await page.focus(CONSTANTS.SEARCH_RECORD_INPUT)
        await page.keyboard.press('Backspace');
        await page.keyboard.type(start.toString())
        await page.focus(CONSTANTS.FIRST_TAB)
    }
    console.log('First record loaded')
    console.log('Scraping...')

    let result = {};
    let counter = 0;
    let skip_counter = 0;
    for (let i = start; i <= end; i++) {

        // go to first tab
        await page.click(CONSTANTS.FIRST_TAB);
        await page.waitForTimeout(CONSTANTS.TIMEOUT);

        try {
            let pageResult = await parsePage(page)
            Object.assign(result, pageResult);
            counter++;
        } catch (e) {
            console.log('Some error occurred on a record: ' + i);
            console.log('Retrying record ' + i + ' ...');
            try {
                // go to first tab
                await page.click(CONSTANTS.FIRST_TAB);
                await page.waitForTimeout(CONSTANTS.TIMEOUT);
                let pageResult = await parsePage(page)
                Object.assign(result, pageResult);
                counter++;
            } catch (e) {
                console.log('Unable to scrape record ' + i)
                console.log('Skipping...')
                skip_counter++;
            }
        }

        if (i !== end) {
            // // go to next record page
            await page.click(CONSTANTS.NEXT_RECORD);
            await page.waitForTimeout(CONSTANTS.TIMEOUT);
        }
    }

    await browser.close();
    console.log('Scraped ' + counter + ' records, from ' + start + ' to ' + end)
    console.log('Skipped ' + skip_counter + ' records')
    console.log('Saving data...')
    return result;
}

const parsePage = async (page) => {
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

    // Go to last tab
    await page.click(CONSTANTS.LAST_TAB);
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
