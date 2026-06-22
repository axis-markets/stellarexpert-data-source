const {xdr, scValToNative} = require('@stellar/stellar-sdk')

/**
 * AXIS order event
 */
class OrderEvent {
    /**
     * Unique order ID
     * @type {bigint}
     */
    id
    /**
     *
     * @type {'created'|'updated'|'removed'}
     */
    action
    /**
     * Order type
     * @type {number}
     */
    kind
    /**
     * Buying token address
     * @type {string}
     */
    buying
    /**
     * Selling token address
     * @type {string}
     */
    selling
    /**
     * Order price
     * @type {bigint}
     */
    price
    /**
     * Initial selling amount
     * @type {bigint}
     */
    quote
    /**
     * Selling amount left
     * @type {bigint}
     */
    amount
    /**
     * Maker address
     * @type {string}
     */
    owner
    /**
     * Expiration timestamp, in UNIX milliseconds
     * @type {number}
     */
    expires = 0
    /**
     * Data pagination cursor
     * @type {string}
     */
    cursor
    /**
     * Event date
     * @type {number}
     */
    ts
}

/**
 * AXIS trade event
 */
class TradeEvent {
    /**
     * Unique trade ID
     * @type {bigint}
     */
    id
    /**
     * Order id
     * @type {bigint}
     */
    order
    /**
     * Trader account address
     * @type {string}
     */
    taker
    /**
     * Seller account address
     * @type {string}
     */
    maker
    /**
     * Selling token
     * @type {string}
     */
    soldAsset
    /**
     * Buying token
     * @type {string}
     */
    boughtAsset
    /**
     * Sold tokens amount
     * @type {bigint}
     */
    sold
    /**
     * Bought tokens amount
     * @type {bigint}
     */
    bought
    /**
     * Data pagination cursor
     * @type {string}
     */
    cursor
    /**
     * Trade date
     * @type {number}
     */
    ts
}

/**
 * AXIS multi-market swap event
 */
class SwapEvent {
    /**
     * Unique swap ID
     * @type {bigint}
     */
    id
    /**
     * Selling token
     * @type {string}
     */
    soldAsset
    /**
     * Buying token
     * @type {string}
     */
    boughtAsset
    /**
     * Sold tokens amount
     * @type {bigint}
     */
    sold
    /**
     * Bought tokens amount
     * @type {bigint}
     */
    bought
    /**
     * Trader account address
     * @type {string}
     */
    trader
    /**
     * Data pagination cursor
     * @type {string}
     */
    cursor
    /**
     * Event date
     * @type {number}
     */
    ts
}

/**
 * @param {ContractEvent} event
 * @return {TradeEvent}
 * @internal
 */
function parseTradeEvent(event) {
    const trade = new TradeEvent()
    const parsed = scValToNative(xdr.ScVal.fromXDR(event.bodyXdr, 'base64'))
    trade.ts = event.ts
    trade.id = parsed.id
    trade.order = parsed.order
    trade.taker = parsed.taker
    trade.maker = parsed.maker
    trade.soldAsset = parsed.selling
    trade.boughtAsset = parsed.buying
    trade.sold = parsed.sold
    trade.bought = parsed.bought
    trade.cursor = event.paging_token
    return trade
}

/**
 * @param {ContractEvent} event
 * @return {OrderEvent}
 * @internal
 */
function parseOrderEvent(event) {
    const order = new OrderEvent()
    const parsed = scValToNative(xdr.ScVal.fromXDR(event.bodyXdr, 'base64'))
    order.ts = event.ts
    order.action = event.topics[2]
    order.id = parsed.id
    order.kind = parsed.kind
    order.owner = parsed.owner
    order.selling = parsed.selling
    order.buying = parsed.buying
    order.price = parsed.price
    order.amount = parsed.amount
    order.quote = parsed.quote
    order.expires = parsed.expires
    order.cursor = event.paging_token
    return order
}

/**
 * @param {ContractEvent} event
 * @return {SwapEvent}
 * @internal
 */
function parseSwapEvent(event) {
    const swap = new SwapEvent()
    const parsed = scValToNative(xdr.ScVal.fromXDR(event.bodyXdr, 'base64'))
    swap.id = parsed.id
    swap.ts = event.ts
    swap.trader = parsed.trader
    swap.soldAsset = parsed.selling
    swap.boughtAsset = parsed.buying
    swap.sold = parsed.sold
    swap.bought = parsed.bought
    swap.cursor = event.paging_token
    return swap
}

module.exports = {OrderEvent, TradeEvent, SwapEvent, parseOrderEvent, parseTradeEvent, parseSwapEvent}