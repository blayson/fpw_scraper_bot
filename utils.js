import fs from "fs";

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

export const getFullDate = () => {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds
}

export class Logger {
    constructor(debug, date) {
        this.debug = debug
        this.date = date
    }

    log(msg, e = null) {
        let full_msg = '(' + getFullDate() + ') ' + msg;
        if (!fs.existsSync('logs/')) {
            fs.mkdirSync('logs/');
        }
        fs.appendFile('logs/log_' + this.date + '.txt', full_msg + '\n', 'utf-8',(err) => {
            if (err) {
                throw err;
            }
            console.log(full_msg);
        });
        if (e !== null) {
            let full_e = '(' + getFullDate() + ') ' + e;
            fs.appendFile('logs/log_' + this.date + '.txt', full_e + '\n', 'utf-8',(err) => {
                if (err) {
                    throw err;
                }
            });
            if (this.debug) {
                console.log(full_e);
            }
        }
    }
}
