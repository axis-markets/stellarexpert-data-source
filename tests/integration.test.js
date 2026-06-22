const loadEvents = require('../src/loader')
const StellarExpertDataSource = require('../src/index')

const testApiResponse = require('./api-reponse.json')
const {TradeEvent, SwapEvent, OrderEvent} = require('../src/types')
const network = 'testnet'
const contract = 'CAMVVLM3O63QWCUTY6AO4SNNBYW6X7EU52UBTU32JQWWF5AG72FMJ72D'

// Mock global fetch before requiring modules that use it
const mockFetch = jest.fn()
global.fetch = mockFetch

function mockFetchResponse(data) {
    mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(data)
    })
}

beforeEach(() => {
    jest.useFakeTimers()
    mockFetch.mockReset()
})

afterEach(() => {
    jest.useRealTimers()
})


describe('loadEvents', () => {
    test('fetches events from the correct URL', async () => {
        mockFetchResponse(testApiResponse)

        await loadEvents(network, contract)

        expect(mockFetch).toHaveBeenCalledTimes(1)
        const url = mockFetch.mock.calls[0][0]
        expect(url).toContain(`/explorer/${network}/contract/${contract}/events`)
        expect(url).toContain('order=asc')
    })

    test('appends cursor when provided', async () => {
        mockFetchResponse(testApiResponse)

        await loadEvents(network, contract, '123-456')

        const url = mockFetch.mock.calls[0][0]
        expect(url).toContain('cursor=123-456')
    })

    test('returns embedded records from the response', async () => {
        mockFetchResponse(testApiResponse)

        const result = await loadEvents(network, contract)

        expect(result).toEqual(testApiResponse._embedded.records)
        expect(result).toHaveLength(9)
    })
})

describe('StellarExpertDataSource', () => {
    let ds

    beforeEach(() => {
        ds = new StellarExpertDataSource()
    })

    afterEach(async () => {
        await ds.dispose()
    })

    test('processes order, trade, and swap events', async () => {
        // Return all records (less than PAGE_SIZE=200), so it stops after one fetch
        mockFetchResponse(testApiResponse)

        const orderEvents = []
        const tradeEvents = []

        ds.onOrderEvent = event => orderEvents.push(event)
        ds.onTradeEvent = event => tradeEvents.push(event)
        ds.onSwapEvent = event => tradeEvents.push(event)

        await ds.init(network, contract)
        // Allow the async loadData to complete
        await jest.advanceTimersByTimeAsync(0)

        // There are 6 order events in the test data
        expect(orderEvents.length).toBe(6)
        expect(orderEvents[0]).toStrictEqual(createEventInstance(OrderEvent, {
            id: 1n,
            action: 'created',
            kind: 1,
            buying: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            selling: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            price: 1200000000000000000n,
            quote: 20000000n,
            amount: 20000000n,
            owner: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            expires: 0n,
            cursor: '6465879990611969-0000',
            ts: 1773528090
        }))
        expect(orderEvents[3]).toStrictEqual(createEventInstance(OrderEvent, {
            id: 2n,
            action: 'updated',
            kind: 1,
            buying: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            selling: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            price: 1100000000000000000n,
            quote: 30000000n,
            amount: 24500000n,
            owner: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            expires: 0n,
            cursor: '6466146278580225-0003',
            ts: 1773528400
        }))

        expect(orderEvents[5]).toStrictEqual(createEventInstance(OrderEvent, {
            id: 2n,
            action: 'removed',
            kind: 1,
            buying: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            selling: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            price: 1100000000000000000n,
            quote: 30000000n,
            amount: 24500000n,
            owner: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            expires: 0n,
            cursor: '6466249357807617-0005',
            ts: 1773528520
        }))
        // and two trade events
        expect(tradeEvents.length).toBe(3)
        expect(tradeEvents[0]).toStrictEqual(createEventInstance(TradeEvent, {
            id: 1n,
            order: 2n,
            taker: 'GBDCULE53LUPK4XHUCXBI35MAZFQHENMZ3JRKAJS2PPYBV646M6XKVHG',
            maker: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            soldAsset: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            boughtAsset: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            sold: 5000000n,
            bought: 5500000n,
            cursor: '6466146278580225-0002',
            ts: 1773528400
        }))
        expect(tradeEvents[1]).toStrictEqual(createEventInstance(TradeEvent, {
            id: 2n,
            order: 2n,
            taker: 'GBDCULE53LUPK4XHUCXBI35MAZFQHENMZ3JRKAJS2PPYBV646M6XKVHG',
            maker: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            soldAsset: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            boughtAsset: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            sold: 22272727n,
            bought: 24500000n,
            cursor: '6466249357807617-0004',
            ts: 1773528520
        }))
        // and one swap event
        expect(tradeEvents[2]).toStrictEqual(createEventInstance(SwapEvent, {
            id: 1139n,
            soldAsset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
            boughtAsset: 'CC72F57YTPX76HAA64JQOEGHQAPSADQWSY5DWVBR66JINPFDLNCQYHIC',
            sold: 2000000n,
            bought: 6675531n,
            cursor: '13802117923901441-0013',
            ts: 1782081386,
            trader: 'GBDCULE53LUPK4XHUCXBI35MAZFQHENMZ3JRKAJS2PPYBV646M6XKVHG'
        }))

        // Cursor should be the id of the last processed event
        expect(ds.cursor).toBe('13802117923901441-0013')

        // After processing, a timer should be set for the next polling cycle
        expect(ds.timer).toBeDefined()
    })

    test('invokes onError when event processing fails', async () => {
        mockFetchResponse(testApiResponse)
        jest.spyOn(console, 'error').mockImplementation(() => {
        })

        const errors = []
        ds.onError = (e) => errors.push(e)
        // Provide a broken handler to trigger an error
        ds.onOrderEvent = () => {
            throw new Error('handler error')
        }

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(0)

        expect(errors.length).toBeGreaterThan(0)
        expect(errors[0].message).toBe('handler error')
        console.error.mockRestore()
    })

    test('invokes onError when fetch fails', async () => {
        // First call fails, second call returns empty to stop the loop
        mockFetch.mockRejectedValueOnce(new Error('network error'))
        mockFetchResponse({_embedded: {records: []}})
        jest.spyOn(console, 'error').mockImplementation(() => {
        })

        const errors = []
        ds.onError = (e) => errors.push(e)

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(1000)

        expect(errors.length).toBeGreaterThan(0)
        expect(errors[0].message).toBe('network error')
        console.error.mockRestore()
    })

    test('parsed order events have correct fields', async () => {
        mockFetchResponse(testApiResponse)

        const orders = []
        ds.onOrderEvent = (event) => orders.push(event)

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(0)

        expect(orders[0]).toMatchObject({
            action: 'created',
            id: 1n,
            kind: 1,
            owner: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            selling: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            buying: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            price: 1200000000000000000n,
            amount: 20000000n,
            ts: 1773528090
        })
    })

    test('parsed trade events have correct fields', async () => {
        mockFetchResponse(testApiResponse)

        const trades = []
        ds.onTradeEvent = (event) => trades.push(event)

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(0)

        expect(trades[0]).toMatchObject({
            id: 1n,
            order: 2n,
            taker: 'GBDCULE53LUPK4XHUCXBI35MAZFQHENMZ3JRKAJS2PPYBV646M6XKVHG',
            maker: 'GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23',
            soldAsset: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ',
            boughtAsset: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
            sold: 5000000n,
            bought: 5500000n,
            ts: 1773528400
        })
    })

    test('dispose stops the polling timer', async () => {
        mockFetchResponse(testApiResponse)

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(0)

        const timer = ds.timer
        expect(timer).toBeDefined()

        await ds.dispose()

        // After dispose, advancing timers should not trigger another fetch
        mockFetch.mockReset()
        await jest.advanceTimersByTimeAsync(ds.pollingPeriod + 1000)
        expect(mockFetch).not.toHaveBeenCalled()
    })
})

function createEventInstance(type, data) {
    const res = new type()
    Object.assign(res, data)
    return res
}
