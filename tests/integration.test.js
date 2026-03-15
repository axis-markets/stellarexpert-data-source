const loadEvents = require('../src/loader')
const StellarExpertDataSource = require('../src/index')

const testApiResponse = require('./api-reponse.json')
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
        expect(result).toHaveLength(8)
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

    test('processes order and trade events', async () => {
        // Return all records (less than PAGE_SIZE=200), so it stops after one fetch
        mockFetchResponse(testApiResponse)

        const orderEvents = []
        const tradeEvents = []

        ds.onOrderEvent = (event) => orderEvents.push(event)
        ds.onTradeEvent = event=>tradeEvents.push(event)

        await ds.init(network, contract)
        // Allow the async loadData to complete
        await jest.advanceTimersByTimeAsync(0)

        // There are 6 order events in the test data
        expect(orderEvents.length).toBe(6)
        expect(orderEvents[0].action).toBe('created')
        expect(orderEvents[0].cursor).toBe('6465879990611969-0000')
        // and two trade events
        expect(tradeEvents.length).toBe(2)
        expect(tradeEvents[0].cursor).toBe('6466146278580225-0002')
        expect(tradeEvents[1].cursor).toBe('6466249357807617-0004')

        // Cursor should be the id of the last processed event
        expect(ds.cursor).toBe('6466249357807617-0005')

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

        const firstOrder = orders[0]
        expect(firstOrder.action).toBe('created')
        expect(firstOrder.id).toEqual(1n)
        expect(firstOrder.kind).toEqual(1)
        expect(firstOrder.owner).toBe('GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23')
        expect(firstOrder.selling).toBe('CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA')
        expect(firstOrder.buying).toBe('CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ')
        expect(firstOrder.price).toEqual(1200000000000000000n)
        expect(firstOrder.amount).toEqual(20000000n)
        expect(firstOrder.ts).toEqual(1773528090)
    })

    test('parsed trade events have correct fields', async () => {
        mockFetchResponse(testApiResponse)

        const trades = []
        ds.onTradeEvent = (event) => trades.push(event)

        await ds.init(network, contract)
        await jest.advanceTimersByTimeAsync(0)

        const firstTrade = trades[0]
        expect(firstTrade.id).toEqual(1n)
        expect(firstTrade.order).toEqual(2n)
        expect(firstTrade.taker).toBe('GBDCULE53LUPK4XHUCXBI35MAZFQHENMZ3JRKAJS2PPYBV646M6XKVHG')
        expect(firstTrade.maker).toBe('GB7TZS65DOB3KJLRPT2EDTMZQSCORUIQGCKP7XVNZ77VNKOTKQEY7F23')
        expect(firstTrade.soldAsset).toBe('CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ')
        expect(firstTrade.boughtAsset).toBe('CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA')
        expect(firstTrade.sold).toEqual(5000000n)
        expect(firstTrade.bought).toEqual(5500000n)
        expect(firstTrade.ts).toBe(1773528400)
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
