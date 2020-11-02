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
