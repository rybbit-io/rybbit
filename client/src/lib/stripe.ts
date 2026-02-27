export interface StripePrice {
  priceId: string;
  price: number;
  name: string;
  interval: string;
  events: number;
  shortName: string;
}

const STRIPE_PRICES: StripePrice[] = [
  {
    priceId: "price_1T2No5DFVprnAny2ahUc6TEI",
    name: "basic100k",
    interval: "month",
    price: 14,
    events: 100_000,
    shortName: "100k",
  },
  {
    priceId: "price_1T2NqJDFVprnAny21UlXbpxY",
    name: "basic100k-annual",
    interval: "year",
    price: 14 * 8,
    events: 100_000,
    shortName: "100k",
  },
  {
    priceId: "price_1T2NpzDFVprnAny2EmAIheV8",
    name: "basic250k",
    interval: "month",
    price: 24,
    events: 250_000,
    shortName: "250k",
  },
  {
    priceId: "price_1T2NrRDFVprnAny2N4KhTwQn",
    name: "basic250k-annual",
    interval: "year",
    price: 24 * 8,
    events: 250_000,
    shortName: "250k",
  },
  // Standard tiers
  {
    price: 19,
    priceId: "price_1RKuxUDFVprnAny2xyyWvXNr",
    name: "standard100k",
    interval: "month",
    shortName: "100k",
    events: 100_000,
  },
  {
    price: 19 * 8,
    priceId: "price_1SyiH0DFVprnAny2RGghi13M",
    name: "standard100k-annual",
    interval: "year",
    shortName: "100k",
    events: 100_000,
  },
  {
    price: 29,
    priceId: "price_1RKuxTDFVprnAny2TS4Qz0Hi",
    name: "standard250k",
    interval: "month",
    shortName: "250k",
    events: 250_000,
  },
  {
    price: 29 * 8,
    priceId: "price_1SyiHJDFVprnAny2xSJxxLW0",
    name: "standard250k-annual",
    interval: "year",
    shortName: "250k",
    events: 250_000,
  },
  {
    name: "standard500k",
    priceId: "price_1RKuxSDFVprnAny2L7hbJSmO",
    price: 49,
    interval: "month",
    shortName: "500k",
    events: 500_000,
  },
  {
    name: "standard500k-annual",
    priceId: "price_1SyiGFDFVprnAny2gTPDOtpy",
    price: 49 * 8,
    interval: "year",
    shortName: "500k",
    events: 500_000,
  },
  {
    name: "standard1m",
    priceId: "price_1RKuxRDFVprnAny2UnTeUnYl",
    price: 69,
    interval: "month",
    shortName: "1m",
    events: 1_000_000,
  },
  {
    name: "standard1m-annual",
    priceId: "price_1SyiGTDFVprnAny2J19JdKFb",
    price: 69 * 8,
    interval: "year",
    shortName: "1m",
    events: 1_000_000,
  },
  {
    name: "standard2m",
    priceId: "price_1RKuxPDFVprnAny2pvdhKxSL",
    price: 99,
    interval: "month",
    shortName: "2m",
    events: 2_000_000,
  },
  {
    name: "standard2m-annual",
    priceId: "price_1SyiGjDFVprnAny2XcoFwB8f",
    price: 99 * 8,
    interval: "year",
    shortName: "2m",
    events: 2_000_000,
  },
  {
    name: "standard5m",
    priceId: "price_1RKuxKDFVprnAny2pytTqnzP",
    price: 149,
    interval: "month",
    shortName: "5m",
    events: 5_000_000,
  },
  {
    name: "standard5m-annual",
    priceId: "price_1SyiFhDFVprnAny2GoHXTm0K",
    price: 149 * 8,
    interval: "year",
    shortName: "5m",
    events: 5_000_000,
  },
  {
    name: "standard10m",
    priceId: "price_1RKuxNDFVprnAny2HkZXUcZN",
    price: 249,
    interval: "month",
    shortName: "10m",
    events: 10_000_000,
  },
  {
    name: "standard10m-annual",
    priceId: "price_1SyiFzDFVprnAny2OLUIUK0o",
    price: 249 * 8,
    interval: "year",
    shortName: "10m",
    events: 10_000_000,
  },
  {
    name: "standard20m",
    priceId: "price_1SKXvkDFVprnAny2cnF3yDyB",
    price: 399,
    interval: "month",
    shortName: "20m",
    events: 20_000_000,
  },
  {
    name: "standard20m-annual",
    priceId: "price_1SyiDzDFVprnAny2kSldxh49",
    price: 399 * 8,
    interval: "year",
    shortName: "20m",
    events: 20_000_000,
  },
  // Pro tiers
  {
    price: 39,
    priceId: "price_1S8szIDFVprnAny2Hg7cxG5b",
    name: "pro100k",
    interval: "month",
    shortName: "100k",
    events: 100_000,
  },
  {
    price: 39 * 8,
    priceId: "price_1SyiEMDFVprnAny2oWEiR1Qa",
    name: "pro100k-annual",
    interval: "year",
    shortName: "100k",
    events: 100_000,
  },
  {
    price: 59,
    priceId: "price_1S8szHDFVprnAny2VyF3ZOuF",
    name: "pro250k",
    interval: "month",
    shortName: "250k",
    events: 250_000,
  },
  {
    price: 59 * 8,
    priceId: "price_1SyiEdDFVprnAny2OCEMbT42",
    name: "pro250k-annual",
    interval: "year",
    shortName: "250k",
    events: 250_000,
  },
  {
    price: 99,
    priceId: "price_1S8szEDFVprnAny2hi4ZSoS8",
    name: "pro500k",
    interval: "month",
    shortName: "500k",
    events: 500_000,
  },
  {
    price: 99 * 8,
    priceId: "price_1SyiEsDFVprnAny2ougv1XOJ",
    name: "pro500k-annual",
    interval: "year",
    shortName: "500k",
    events: 500_000,
  },
  {
    price: 139,
    priceId: "price_1S8szCDFVprnAny28ccBSIDh",
    name: "pro1m",
    interval: "month",
    shortName: "1M",
    events: 1_000_000,
  },
  {
    price: 139 * 8,
    priceId: "price_1SyiFBDFVprnAny2X5xb73Si",
    name: "pro1m-annual",
    interval: "year",
    shortName: "1M",
    events: 1_000_000,
  },
  {
    price: 199,
    priceId: "price_1S8szBDFVprnAny2h8aeoObg",
    name: "pro2m",
    interval: "month",
    shortName: "2M",
    events: 2_000_000,
  },
  {
    price: 199 * 8,
    priceId: "price_1SyiHtDFVprnAny2vmDMP6fu",
    name: "pro2m-annual",
    interval: "year",
    shortName: "2M",
    events: 2_000_000,
  },
  {
    price: 299,
    priceId: "price_1S8sz9DFVprnAny2Mjrl9je6",
    name: "pro5m",
    interval: "month",
    shortName: "5M",
    events: 5_000_000,
  },
  {
    price: 299 * 8,
    priceId: "price_1SyiHcDFVprnAny2B3bt5ZMs",
    name: "pro5m-annual",
    interval: "year",
    shortName: "5M",
    events: 5_000_000,
  },
  {
    price: 499,
    priceId: "price_1S8sz5DFVprnAny2PQR4etWx",
    name: "pro10m",
    interval: "month",
    shortName: "10M",
    events: 10_000_000,
  },
  {
    price: 499 * 8,
    priceId: "price_1SyiAaDFVprnAny2iWpXTyFV",
    name: "pro10m-annual",
    interval: "year",
    shortName: "10M",
    events: 10_000_000,
  },
  {
    price: 799,
    priceId: "price_1SKXw0DFVprnAny2Au9JTwnX",
    name: "pro20m",
    interval: "month",
    shortName: "20M",
    events: 20_000_000,
  },
  {
    price: 799 * 8,
    priceId: "price_1Syi5UDFVprnAny2ALnTjery",
    name: "pro20m-annual",
    interval: "year",
    shortName: "20M",
    events: 20_000_000,
  },
];

export const STRIPE_TIERS = STRIPE_PRICES.filter(
  price => price.interval === "month" && price.name.startsWith("standard")
).map(price => ({
  events: price.events,
  shortName: price.shortName,
}));

const TEST_TO_PRICE_ID = {
  standard100k: "price_1R1fIVDFVprnAny2yJtRRPBm",
  "standard100k-annual": "price_1R2l2KDFVprnAny2iZr5gFLe",
  standard250k: "price_1R1fKJDFVprnAny2mfiBjkAQ",
  "standard250k-annual": "price_1R2lJIDFVprnAny22zUvjg5o",
  standard500k: "price_1R1fQlDFVprnAny2WwNdiRgT",
  "standard500k-annual": "price_1R2lKIDFVprnAny27wXUAy2D",
  standard1m: "price_1R1fR2DFVprnAny28tPEQAwh",
  "standard1m-annual": "price_1R2lKtDFVprnAny2Xl98rgu4",
  standard2m: "price_1R1fRMDFVprnAny24AMo0Vuu",
  "standard2m-annual": "price_1RE1bQDFVprnAny2ELKQS79d",
  standard5m: "price_1RKuYJDFVprnAny2apEXvkde",
  "standard5m-annual": "price_1RKuYaDFVprnAny2xEoejLRR",
  standard10m: "price_1RKuX5DFVprnAny20UMfh10N",
  "standard10m-annual": "price_1RKuXODFVprnAny2JUjrCSyY",
  pro100k: "price_1S8kgSDFVprnAny2LCbjTkNa",
  "pro100k-annual": "price_1S8kmQDFVprnAny2hZqkMgwT",
  pro250k: "price_1S8kgxDFVprnAny2YSAnQMA6",
  "pro250k-annual": "price_1S8kmHDFVprnAny2cvl0p8OM",
  pro500k: "price_1S8khiDFVprnAny2730Lm8xf",
  "pro500k-annual": "price_1S8km1DFVprnAny28WpKikFH",
  pro1m: "price_1S8ki0DFVprnAny2kwXpmQ7M",
  "pro1m-annual": "price_1S8klqDFVprnAny2mkVUdErk",
  pro2m: "price_1S8kiODFVprnAny217jeiSP3",
  "pro2m-annual": "price_1S8klfDFVprnAny24Yk3Y7HD",
  pro5m: "price_1S8kioDFVprnAny2DV8THSQr",
  "pro5m-annual": "price_1S8klTDFVprnAny2Na9XXAEI",
  pro10m: "price_1S8kkKDFVprnAny2WDjO98bN",
  "pro10m-annual": "price_1S8kl3DFVprnAny2Xdhho4F0",
  standard20m: "price_1SKtYyDFVprnAny2ZT1K2gVP",
  "standard20m-annual": "price_1SKtZ8DFVprnAny2HwSpfzS8",
  pro20m: "price_1SKtYZDFVprnAny2WUpCtCzm",
  "pro20m-annual": "price_1SKtYkDFVprnAny2ikpbKAA6",
};

export const getStripePrices = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL?.includes("app.rybbit.io")) {
    return STRIPE_PRICES;
  }
  return STRIPE_PRICES.map(price => ({
    ...price,
    priceId: TEST_TO_PRICE_ID[price.name as keyof typeof TEST_TO_PRICE_ID],
  }));
};

export function getPlanType(name: string) {
  if (name.includes("basic")) {
    return "Basic";
  }
  if (name.includes("standard")) {
    return "Standard";
  }
  if (name.includes("pro")) {
    return "Pro";
  }
  return "Free"
}