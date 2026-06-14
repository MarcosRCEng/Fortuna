import type { FiiDetailsProvider, LoggerPort, TreasuryMarketProvider } from "@fortuna/application";
import type {
  FiiDetails,
  FiiDividend,
  FiiManagementType,
  FiiMandate,
  MarketProDataState,
  TreasuryBond,
  TreasuryBondType,
  TreasuryCatalogPage,
  TreasuryCatalogQuery,
  TreasuryCouponType,
  TreasuryHistory,
  TreasuryHistoryPoint,
  TreasuryHistoryQuery,
  TreasuryIndexer,
  TreasuryIndicator,
  TreasuryRateInterpretation,
} from "@fortuna/domain";
import type { MarketDataConfig } from "../config/MarketDataConfig.js";

type FetchLike = (
  input: string | URL,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;

type BrapiFiiDetailsResponse = {
  results?: BrapiFiiDetails[];
  data?: BrapiFiiDetails;
};

type BrapiFiiDividendsResponse = {
  results?: BrapiFiiDividend[];
  dividends?: BrapiFiiDividend[];
};

type BrapiTreasuryCatalogResponse = {
  results?: BrapiTreasuryBond[];
  bonds?: BrapiTreasuryBond[];
  total?: number;
};

type BrapiTreasuryIndicatorResponse = {
  results?: BrapiTreasuryIndicator[];
  indicators?: BrapiTreasuryIndicator[];
};

type BrapiTreasuryHistoryResponse = {
  results?: BrapiTreasuryHistoryPoint[];
  prices?: BrapiTreasuryHistoryPoint[];
};

type BrapiFiiDetails = {
  symbol?: string;
  ticker?: string;
  pvp?: number;
  priceToBook?: number;
  dividendYield12Months?: number;
  dy12m?: number;
  equity?: number;
  netWorth?: number;
  patrimony?: number;
  vacancy?: number;
  segment?: string;
  sector?: string;
  managementType?: string;
  management?: string;
  mandate?: string;
  shareholders?: number;
  shareholdersCount?: number;
  referenceDate?: string;
  updatedAt?: string;
  delayMinutes?: number;
  isDelayed?: boolean;
};

type BrapiFiiDividend = {
  symbol?: string;
  ticker?: string;
  amount?: number;
  value?: number;
  paymentDate?: string;
  paidAt?: string;
  baseDate?: string;
  comDate?: string;
  isDelayed?: boolean;
};

type BrapiTreasuryBond = {
  symbol?: string;
  slug?: string;
  name?: string;
  type?: string;
  bondType?: string;
  indexer?: string;
  couponType?: string;
  maturityDate?: string;
  dueDate?: string;
  buyRate?: number;
  sellRate?: number;
  rateInterpretation?: string;
  buyPrice?: number;
  sellPrice?: number;
  basePrice?: number;
  durationDays?: number;
  referenceDate?: string;
  updatedAt?: string;
  isDelayed?: boolean;
};

type BrapiTreasuryIndicator = BrapiTreasuryBond;

type BrapiTreasuryHistoryPoint = {
  symbol?: string;
  slug?: string;
  date?: string;
  buyRate?: number;
  sellRate?: number;
  buyPrice?: number;
  sellPrice?: number;
  basePrice?: number;
};

export type MarketProProviderCapability = "fiiPro" | "treasuryPro";

export class MarketProProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketProProviderConfigurationError";
  }
}

export class MarketProCapabilityDisabledError extends Error {
  readonly code = "NOT_AVAILABLE_IN_CURRENT_PLAN";

  constructor(readonly capability: MarketProProviderCapability) {
    super(`${capability} is not available in the current plan.`);
    this.name = "MarketProCapabilityDisabledError";
  }
}

export class MarketProProviderRequestError extends Error {
  constructor(
    readonly code:
      | "HTTP_ERROR"
      | "TIMEOUT"
      | "PLAN_FORBIDDEN"
      | "INVALID_RESPONSE",
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "MarketProProviderRequestError";
  }
}

export class DisabledFiiDetailsProvider implements FiiDetailsProvider {
  async getFiiDetails(): Promise<FiiDetails> {
    throw new MarketProCapabilityDisabledError("fiiPro");
  }

  async getFiiDividends(): Promise<FiiDividend[]> {
    throw new MarketProCapabilityDisabledError("fiiPro");
  }
}

export class DisabledTreasuryMarketProvider implements TreasuryMarketProvider {
  async listTreasuryBonds(): Promise<TreasuryCatalogPage> {
    throw new MarketProCapabilityDisabledError("treasuryPro");
  }

  async getTreasuryIndicators(): Promise<TreasuryIndicator[]> {
    throw new MarketProCapabilityDisabledError("treasuryPro");
  }

  async getTreasuryHistory(): Promise<TreasuryHistory> {
    throw new MarketProCapabilityDisabledError("treasuryPro");
  }
}

export class BrapiFiiDetailsProvider implements FiiDetailsProvider {
  constructor(
    private readonly config: MarketDataConfig,
    private readonly logger?: LoggerPort,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {
    assertProProviderCanStart(config, "fiiPro");
  }

  async getFiiDetails(symbol: string): Promise<FiiDetails> {
    const normalized = normalizeTicker(symbol);
    const payload = await this.fetchJson<BrapiFiiDetailsResponse>(
      `v2/fii/${normalized}`,
    );
    const item = payload.data ?? payload.results?.[0];
    if (!item) {
      throw new MarketProProviderRequestError(
        "INVALID_RESPONSE",
        "brapi FII response is empty.",
      );
    }
    return mapFiiDetails(item, normalized, this.clock());
  }

  async getFiiDividends(symbol: string): Promise<FiiDividend[]> {
    const normalized = normalizeTicker(symbol);
    const payload = await this.fetchJson<BrapiFiiDividendsResponse>(
      `v2/fii/${normalized}/dividends`,
    );
    const rows = payload.results ?? payload.dividends ?? [];
    return rows.map((item) => mapFiiDividend(item, normalized));
  }

  private async fetchJson<T>(path: string): Promise<T> {
    return fetchBrapiJson<T>(
      this.config,
      path,
      this.fetchImpl,
      this.logger,
      "fii_pro",
    );
  }
}

export class BrapiTreasuryMarketProvider implements TreasuryMarketProvider {
  constructor(
    private readonly config: MarketDataConfig,
    private readonly logger?: LoggerPort,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {
    assertProProviderCanStart(config, "treasuryPro");
  }

  async listTreasuryBonds(
    query: TreasuryCatalogQuery,
  ): Promise<TreasuryCatalogPage> {
    const page = normalizePage(query.page);
    const pageSize = normalizePageSize(query.pageSize);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }
    const payload = await this.fetchJson<BrapiTreasuryCatalogResponse>(
      `v2/treasury/bonds?${params.toString()}`,
    );
    const rows = payload.results ?? payload.bonds ?? [];
    const items = rows.map((item) => mapTreasuryBond(item, this.clock()));
    const totalItems = payload.total ?? items.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      source: "BRAPI",
      dataState: resolveState(rows.some((item) => item.isDelayed)),
      fetchedAt: this.clock().toISOString(),
    };
  }

  async getTreasuryIndicators(symbols: string[]): Promise<TreasuryIndicator[]> {
    const normalized = normalizeTreasurySymbols(symbols);
    const params = new URLSearchParams();
    params.set("symbols", normalized.join(","));
    const payload = await this.fetchJson<BrapiTreasuryIndicatorResponse>(
      `v2/treasury/indicators?${params.toString()}`,
    );
    const rows = payload.results ?? payload.indicators ?? [];
    return rows.map((item) => mapTreasuryIndicator(item, this.clock()));
  }

  async getTreasuryHistory(
    query: TreasuryHistoryQuery,
  ): Promise<TreasuryHistory> {
    const symbol = normalizeTreasurySlug(query.symbol);
    const params = new URLSearchParams();
    if (query.from) {
      params.set("from", query.from);
    }
    if (query.to) {
      params.set("to", query.to);
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    const payload = await this.fetchJson<BrapiTreasuryHistoryResponse>(
      `v2/treasury/history/${symbol}${suffix}`,
    );
    const rows = payload.results ?? payload.prices ?? [];
    return {
      symbol,
      points: rows.map((item) => mapTreasuryHistoryPoint(item, symbol)),
      source: "BRAPI",
      dataState: "REAL",
      fetchedAt: this.clock().toISOString(),
    };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    return fetchBrapiJson<T>(
      this.config,
      path,
      this.fetchImpl,
      this.logger,
      "treasury_pro",
    );
  }
}

export function createFiiDetailsProvider(
  config: MarketDataConfig,
  logger?: LoggerPort,
  fetchImpl?: FetchLike,
  clock?: () => Date,
): FiiDetailsProvider {
  if (!config.capabilities.detailedFiiData) {
    return new DisabledFiiDetailsProvider();
  }
  return new BrapiFiiDetailsProvider(config, logger, fetchImpl, clock);
}

export function createTreasuryMarketProvider(
  config: MarketDataConfig,
  logger?: LoggerPort,
  fetchImpl?: FetchLike,
  clock?: () => Date,
): TreasuryMarketProvider {
  if (!config.capabilities.treasury) {
    return new DisabledTreasuryMarketProvider();
  }
  return new BrapiTreasuryMarketProvider(config, logger, fetchImpl, clock);
}

function assertProProviderCanStart(
  config: MarketDataConfig,
  capability: MarketProProviderCapability,
): void {
  const enabled =
    capability === "fiiPro"
      ? config.capabilities.detailedFiiData
      : config.capabilities.treasury;
  if (enabled && !config.brapi.apiToken) {
    throw new MarketProProviderConfigurationError(
      "BRAPI_API_TOKEN is required when a brapi Pro provider is selected.",
    );
  }
}

async function fetchBrapiJson<T>(
  config: MarketDataConfig,
  path: string,
  fetchImpl: FetchLike,
  logger: LoggerPort | undefined,
  operation: string,
): Promise<T> {
  const url = new URL(
    `${config.brapi.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.brapi.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: config.brapi.apiToken
        ? { Authorization: `Bearer ${config.brapi.apiToken}` }
        : {},
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new MarketProProviderRequestError(
        "PLAN_FORBIDDEN",
        `brapi Pro endpoint rejected the request with HTTP ${response.status}.`,
        response.status,
      );
    }
    if (!response.ok) {
      throw new MarketProProviderRequestError(
        "HTTP_ERROR",
        `brapi Pro endpoint failed with HTTP ${response.status}.`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MarketProProviderRequestError(
        "TIMEOUT",
        "brapi Pro endpoint timed out.",
      );
    }
    logger?.warn("Market Pro provider failed", {
      module: "market_data",
      action: "market_pro_provider_failed",
      context: {
        provider: "brapi",
        operation,
        reason: error instanceof Error ? error.name : "UnknownError",
      },
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapFiiDetails(
  item: BrapiFiiDetails,
  requestedSymbol: string,
  fallbackDate: Date,
): FiiDetails {
  return {
    symbol: normalizeTicker(item.symbol ?? item.ticker ?? requestedSymbol),
    priceToBookBps: toOptionalBps(item.pvp ?? item.priceToBook),
    dividendYield12MonthsBps: toOptionalBps(
      item.dividendYield12Months ?? item.dy12m,
    ),
    equityValueCents: toOptionalMoneyCents(
      item.equity ?? item.netWorth ?? item.patrimony,
    ),
    vacancyBps: toOptionalBps(item.vacancy),
    segment: normalizeOptionalText(item.segment ?? item.sector),
    managementType: mapManagementType(item.managementType ?? item.management),
    mandate: mapFiiMandate(item.mandate),
    shareholderCount: toOptionalInteger(
      item.shareholders ?? item.shareholdersCount,
    ),
    referenceDate: normalizeDateOnly(
      item.referenceDate ?? item.updatedAt,
      fallbackDate,
    ),
    source: "BRAPI",
    delayMinutes: toOptionalInteger(item.delayMinutes),
    dataState: resolveState(Boolean(item.isDelayed)),
  };
}

function mapFiiDividend(
  item: BrapiFiiDividend,
  requestedSymbol: string,
): FiiDividend {
  const paymentDate = item.paymentDate ?? item.paidAt;
  if (item.amount === undefined && item.value === undefined) {
    throw new MarketProProviderRequestError(
      "INVALID_RESPONSE",
      "brapi FII dividend response is missing amount.",
    );
  }
  if (!paymentDate) {
    throw new MarketProProviderRequestError(
      "INVALID_RESPONSE",
      "brapi FII dividend response is missing payment date.",
    );
  }
  return {
    symbol: normalizeTicker(item.symbol ?? item.ticker ?? requestedSymbol),
    amountCents: toMoneyCents((item.amount ?? item.value)!),
    paymentDate: normalizeDateOnly(paymentDate),
    baseDate: normalizeOptionalDateOnly(item.baseDate ?? item.comDate),
    source: "BRAPI",
    dataState: resolveState(Boolean(item.isDelayed)),
  };
}

function mapTreasuryBond(
  item: BrapiTreasuryBond,
  fallbackDate: Date,
): TreasuryBond {
  const symbol = normalizeTreasurySlug(item.symbol ?? item.slug ?? item.name ?? "");
  return {
    symbol,
    name: normalizeOptionalText(item.name) ?? symbol,
    bondType: mapBondType(item.bondType ?? item.type ?? item.name),
    indexer: mapIndexer(item.indexer ?? item.name),
    couponType: mapCouponType(item.couponType ?? item.name),
    maturityDate: normalizeDateOnly(item.maturityDate ?? item.dueDate),
    buyRateBps: toOptionalBps(item.buyRate),
    sellRateBps: toOptionalBps(item.sellRate),
    rateInterpretation: mapRateInterpretation(item.rateInterpretation),
    buyPriceCents: toOptionalMoneyCents(item.buyPrice),
    sellPriceCents: toOptionalMoneyCents(item.sellPrice),
    basePriceCents: toOptionalMoneyCents(item.basePrice),
    durationDays: toOptionalInteger(item.durationDays),
    referenceDate: normalizeDateOnly(
      item.referenceDate ?? item.updatedAt,
      fallbackDate,
    ),
    source: "BRAPI",
    dataState: resolveState(Boolean(item.isDelayed)),
  };
}

function mapTreasuryIndicator(
  item: BrapiTreasuryIndicator,
  fallbackDate: Date,
): TreasuryIndicator {
  const bond = mapTreasuryBond(item, fallbackDate);
  return {
    symbol: bond.symbol,
    buyRateBps: bond.buyRateBps,
    sellRateBps: bond.sellRateBps,
    buyPriceCents: bond.buyPriceCents,
    sellPriceCents: bond.sellPriceCents,
    basePriceCents: bond.basePriceCents,
    referenceDate: bond.referenceDate,
    source: bond.source,
    dataState: bond.dataState,
  };
}

function mapTreasuryHistoryPoint(
  item: BrapiTreasuryHistoryPoint,
  requestedSymbol: string,
): TreasuryHistoryPoint {
  return {
    symbol: normalizeTreasurySlug(item.symbol ?? item.slug ?? requestedSymbol),
    date: normalizeDateOnly(item.date),
    buyRateBps: toOptionalBps(item.buyRate),
    sellRateBps: toOptionalBps(item.sellRate),
    buyPriceCents: toOptionalMoneyCents(item.buyPrice),
    sellPriceCents: toOptionalMoneyCents(item.sellPrice),
    basePriceCents: toOptionalMoneyCents(item.basePrice),
  };
}

function normalizeTicker(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
    throw new MarketProProviderRequestError(
      "INVALID_RESPONSE",
      "Invalid FII symbol.",
    );
  }
  return normalized;
}

export function normalizeTreasurySlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new MarketProProviderRequestError(
      "INVALID_RESPONSE",
      "Invalid treasury symbol slug.",
    );
  }
  return slug;
}

function normalizeTreasurySymbols(symbols: string[]): string[] {
  const normalized = [
    ...new Set(
      symbols
        .flatMap((symbol) => symbol.split(","))
        .map((symbol) => normalizeTreasurySlug(symbol))
        .filter(Boolean),
    ),
  ];
  if (normalized.length === 0) {
    throw new MarketProProviderRequestError(
      "INVALID_RESPONSE",
      "At least one treasury symbol is required.",
    );
  }
  return normalized;
}

function normalizePage(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function normalizePageSize(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100) : 20;
}

function normalizeDateOnly(value: string | undefined, fallback = new Date()): string {
  if (!value) {
    return fallback.toISOString().slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function normalizeOptionalDateOnly(value: string | undefined): string | undefined {
  return value ? normalizeDateOnly(value) : undefined;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toOptionalInteger(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined;
}

function toMoneyCents(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

function toOptionalMoneyCents(value: number | undefined): number | undefined {
  return value === undefined ? undefined : toMoneyCents(value);
}

function toOptionalBps(value: number | undefined): number | undefined {
  return value === undefined || !Number.isFinite(value)
    ? undefined
    : Math.round(value * 100);
}

function resolveState(isDelayed: boolean): MarketProDataState {
  return isDelayed ? "DELAYED" : "REAL";
}

function mapManagementType(value: string | undefined): FiiManagementType | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.includes("ATIV") || normalized === "ACTIVE") {
    return "ACTIVE";
  }
  if (normalized.includes("PASSIV") || normalized === "PASSIVE") {
    return "PASSIVE";
  }
  if (normalized.includes("HIBRID") || normalized.includes("HYBRID")) {
    return "HYBRID";
  }
  return "UNAVAILABLE";
}

function mapFiiMandate(value: string | undefined): FiiMandate | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.includes("PAPER") || normalized.includes("PAPEL")) {
    return "PAPER";
  }
  if (normalized.includes("HYBRID") || normalized.includes("HIBRID")) {
    return "HYBRID";
  }
  if (normalized.includes("FOF") || normalized.includes("FUNDS")) {
    return "FUNDS_OF_FUNDS";
  }
  if (normalized.includes("DEVELOP")) {
    return "DEVELOPMENT";
  }
  if (normalized.includes("BRICK") || normalized.includes("TIJOLO")) {
    return "BRICK";
  }
  return "UNAVAILABLE";
}

function mapBondType(value: string | undefined): TreasuryBondType {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (normalized.includes("SELIC")) {
    return "SELIC";
  }
  if (normalized.includes("PREFIX")) {
    return "PREFIXED";
  }
  if (normalized.includes("IPCA")) {
    return "IPCA";
  }
  if (normalized.includes("RENDA")) {
    return "RENDA_PLUS";
  }
  if (normalized.includes("EDUCA")) {
    return "EDUCA_PLUS";
  }
  return "UNKNOWN";
}

function mapIndexer(value: string | undefined): TreasuryIndexer {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (normalized.includes("SELIC")) {
    return "SELIC";
  }
  if (normalized.includes("IPCA")) {
    return "IPCA";
  }
  if (normalized.includes("IGPM") || normalized.includes("IGP-M")) {
    return "IGPM";
  }
  if (normalized.includes("PREFIX")) {
    return "PREFIXED";
  }
  return "UNKNOWN";
}

function mapCouponType(value: string | undefined): TreasuryCouponType {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (normalized.includes("SEMESTRAL") || normalized.includes("SEMIANNUAL")) {
    return "SEMIANNUAL";
  }
  if (normalized.includes("MENSAL") || normalized.includes("MONTHLY")) {
    return "MONTHLY";
  }
  if (normalized.includes("SEM JUROS") || normalized.includes("NONE")) {
    return "NONE";
  }
  return "UNKNOWN";
}

function mapRateInterpretation(
  value: string | undefined,
): TreasuryRateInterpretation {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (normalized.includes("SPREAD")) {
    return "SPREAD_OVER_INDEXER";
  }
  if (normalized.includes("ANNUAL") || normalized.includes("ANO")) {
    return "ANNUAL_PERCENT";
  }
  return "UNKNOWN";
}
