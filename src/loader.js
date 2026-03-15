const apiOrigin = process.env.API_ORIGIN || 'https://api.stellar.expert'

const PAGE_SIZE = 200

/**
 * @param {string} network
 * @param {string} contract
 * @param {string} cursor
 * @return {Promise<ContractEvent[]>}
 */
function loadEvents(network, contract, cursor) {
    let url = `${apiOrigin}/explorer/${network}/contract/${contract}/events?order=asc&limit=${PAGE_SIZE}`
    if (cursor) {
        url += `&cursor=${cursor}`
    }
    return fetch(url)
        .then(res => res.json())
        .then(res => res._embedded.records)
}

module.exports = loadEvents