export interface ContractEvent {
    id: string;
    ts: number;
    contract: string;
    initiator: string;
    topics: string[];
    topicsXdr: string[];
    bodyXdr: string;
    paging_token: string;
}

export class OrderEvent {
    /** Unique order ID */
    id: bigint;
    /** Order action */
    action: 'created' | 'updated' | 'removed';
    /** Order type */
    kind: number;
    /** Buying token address */
    buying: string;
    /** Selling token address */
    selling: string;
    /** Order price */
    price: bigint;
    /** Initial selling amount */
    quote: bigint;
    /** Selling amount left */
    amount: bigint;
    /** Maker address */
    owner: string;
    /** Expiration timestamp, in UNIX milliseconds */
    expires: number;
    /** Data pagination cursor */
    cursor: string;
    /** Event date */
    ts: number;
}

export class TradeEvent {
    /** Unique trade ID */
    id: bigint;
    /** Order id */
    order: bigint;
    /** Trader account address */
    taker: string;
    /** Seller account address */
    maker: string;
    /** Selling token */
    soldAsset: string;
    /** Buying token */
    boughtAsset: string;
    /** Sold tokens amount */
    sold: bigint;
    /** Bought tokens amount */
    bought: bigint;
    /** Data pagination cursor */
    cursor: string;
    /** Trade date */
    ts: number;
}

export type DataSourceOnTrade = (tradeEvent: TradeEvent) => void;
export type DataSourceOnOrder = (orderEvent: OrderEvent) => void;
export type DataSourceOnError = (error: Error) => void;

/**
 * StellarExpert-based data source provider for AXIS
 */
declare class StellarExpertDataSource {
    /** Data processing pipeline cursor */
    readonly cursor: string;
    /** Event handler invoked on trade */
    onTradeEvent: DataSourceOnTrade;
    /** Event handler invoked on order changes */
    onOrderEvent: DataSourceOnOrder;
    /** Event handler invoked on errors */
    onError: DataSourceOnError;
    /** Data polling period, in milliseconds */
    pollingPeriod: number;
    /** Pause between subsequent data poll requests, in milliseconds */
    pollingPause: number;

    /**
     * Initialize data source and start data polling
     */
    init(network: 'public' | 'testnet', contractAddress: string): Promise<void>;

    /**
     * Stop data polling
     */
    dispose(): Promise<void>;
}

export default StellarExpertDataSource;
