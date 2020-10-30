import https from 'https';
import fs from 'fs';

export const splitAndPrepare = (string, separator) => {
    let preparedData = [];

    try {
        for (let item of string.trim().split(separator)) {
            if (item !== "") {
                preparedData.push(item.trim());
            }
        }
    } catch (e) {
        console.log(e)
    }

    return preparedData
}

export const download = (url, destination) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, response => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(resolve(true));
        });
    }).on('error', error => {
        fs.unlink(destination);
        reject(error.message);
    });
});
