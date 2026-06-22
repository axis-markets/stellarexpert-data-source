const loadEvents = require('./loader')
const {parseTradeEvent, parseOrderEvent, parseSwapEvent} = require('./types')

const PAGE_SIZE = 200

/**
 * StellarExpert-based data source provider for AXIS
 */
class StellarExpertDataSource {
    /**
     * @type {string}
     * @readonly
     */
    contact
    /**
     * @type {string}
     * @readonly
     */
    network
    /**
     * Data processing pipeline cursor
     * @type {string}
     * @readonly
     */
    cursor
    /**
     * Event handler invoked on trade
     * @type {DataSourceOnTrade}
     */
    onTradeEvent
    /**
     * Event handler invoked on order changes
     * @type {DataSourceOnOrder}
     */
    onOrderEvent
    /**
     * Event handler invoked on multi-market swap
     * @type {DataSourceOnSwap}
     */
    onSwapEvent
    /**
     * Event handler invoked on errors
     * @type {DataSourceOnError}
     */
    onError
    /**
     * Data polling period, in milliseconds
     * @type {number}
     */
    pollingPeriod = 2000
    /**
     * Pause between subsequent data poll requests, in milliseconds
     * @type {number}
     */
    pollingPause = 500
    /**
     * @type {NodeJS.Timeout}
     * @private
     */
    timer

    /**
     * Initialize data source and start data polling
     * @param {'public'|'testnet'} network - Stellar network identifier
     * @param {string} contractAddress - AXIS contract address
     * @param {string} cursor - Last processed record pagination cursor
     * @return {Promise}
     */
    async init(network, contractAddress, cursor) {
        this.network = network
        this.contact = contractAddress
        this.cursor = cursor
        this.loadData()
            .catch(e => console.error('Error loading data', e))
    }

    /**
     * Stop data polling
     * @return {Promise}
     */
    async dispose() {
        clearTimeout(this.timer)
    }

    /**
     * @return {Promise<void>}
     * @private
     */
    async loadData() {
        while (true) {
            try {
                const events = await loadEvents(this.network, this.contact, this.cursor)
                for (const event of events) {
                    try {
                        if (event.topics[0] !== 'AXIS') {
                            console.warn('Unknown event', event.topics[0])
                            break
                        }
                        switch (event.topics[1]) {
                            case 'trade':
                                if (this.onTradeEvent) {
                                    this.onTradeEvent(parseTradeEvent(event))
                                }
                                break
                            case 'order':
                                if (this.onOrderEvent) {
                                    this.onOrderEvent(parseOrderEvent(event))
                                }
                                break
                            case 'swap':
                                if (this.onSwapEvent) {
                                    this.onSwapEvent(parseSwapEvent(event))
                                }
                                break
                            default:
                                console.warn('Unknown event type', event.topics[1])
                                break
                        }
                    } catch (e) {
                        console.error('StellarExpertDataSource: Error processing event', e)
                        if (this.onError) {
                            this.onError(e)
                        }
                    }
                    this.cursor = event.id
                    //TODO: save/load cursor on restart
                }

                if (events.length < PAGE_SIZE)
                    break //no more events available
            } catch (e) {
                console.error('StellarExpertDataSource: Error loading events', e)
                if (this.onError) {
                    this.onError(e)
                }
            }
            await new Promise(resolve => setTimeout(resolve, this.pollingPause))
        }
        this.timer = setTimeout(() => this.loadData(), this.pollingPeriod)
    }
}

module.exports = StellarExpertDataSource

/**
 * @callback DataSourceOnTrade
 * @param {TradeEvent} tradeEvent
 */

/**
 * @callback DataSourceOnOrder
 * @param {OrderEvent} orderEvent
 */


/**
 * @callback DataSourceOnSwap
 * @param {SwapEvent} swapEvent
 */

/**
 * @callback DataSourceOnError
 * @param {Error} error
 */

/**
 * @typedef {{}} ContractEvent
 * @property {string} id
 * @property {number} ts
 * @property {string} contract
 * @property {string} initiator
 * @property {string[]} topics
 * @property {string[]} topicsXdr
 * @property {string} bodyXdr
 * @property {string} paging_token
 */