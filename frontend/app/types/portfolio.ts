export interface Portfolio extends Array<Sector> {}

export interface Sector {
  sector: string;
  totalInvestment: number;
  portfolioPercentage: number;
  presentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  stocks: Stock[];
}

export interface Stock {
  id?: number;
  name: string;
  purchasePrice: number;
  qty: number;
  investment: number;
  portfolioPercentage: number;
  symbol: string;
  cmp: number;
  presentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  marketCap?: number | string;
  pe?: number | string;
  latestEarnings?: number | string;
  sector: string;

  fundamentals: Fundamentals;
  growth3yr: GrowthMetrics;

  stage?: string;
  remark: string;
}

export interface Fundamentals {
  revenue: number;
  ebidta: number;
  ebidtaPercent: number;
  pat: number;
  patPercent: number;
  cfo1yr?: number;
  cfo5yr?: number;
  freeCashFlow5yr?: number;
  debtToEquity?: number;
  bookValue?: number;
}

export interface GrowthMetrics {
  revenue: number;
  ebitda: number;
  profilt: number;
  marketCap?: number;
  priceToSales?: number;
  cfoToEbitda?: number;
  cfoToPat?: number;
  priceToBook?: number;
}
