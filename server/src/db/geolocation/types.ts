export type IPAPIResponse = {
  ip: string;
  rir?: string;
  is_bogon?: boolean;
  is_mobile?: boolean;
  is_satellite?: boolean;
  is_crawler?: string | boolean;
  is_datacenter?: boolean;
  is_tor?: boolean;
  is_proxy?: boolean;
  is_vpn?: boolean;
  is_abuser?: boolean;
  elapsed_ms?: number;
  location?: {
    city?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    state?: string;
    continent?: string;
    continent_code?: string;
    postal_code?: string;
    zip?: string;
    region?: string;
    region_code?: string;
  };
  asn?: {
    asn?: number;
    abuser_score?: string;
    route?: string;
    descr?: string;
    country?: string;
    active?: boolean;
    org?: string;
    domain?: string;
    abuse?: string;
    type?: string;
    created?: string;
    updated?: string;
    rir?: string;
    whois?: string;
  };
  vpn?: {
    ip?: string;
    service?: string;
    url?: string;
    type?: string;
    last_seen?: number;
    last_seen_str?: string;
    exit_node_region?: string;
    country_code?: string;
    city_name?: string;
    latitude?: number;
    longitude?: number;
  };
  datacenter?: {
    datacenter?: string;
    network?: string;
    region?: string;
    country?: string;
    city?: string;
  };
  company?: {
    name?: string;
    abuser_score?: string;
    domain?: string;
    type?: string;
    network?: string;
    whois?: string;
  };
  abuse?: {
    name?: string;
    address?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
};

export type LocationResponse = {
  city?: string;
  country?: string;
  region?: string;
  countryIso?: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
  error?: string;

  vpn?: string;
  crawler?: string;
  datacenter?: string;
  isProxy?: boolean;
  isTor?: boolean;
  isSatellite?: boolean;

  company?: {
    name?: string;
    domain?: string;
    type?: string;
    abuseScore?: number;
  };

  asn?: {
    asn?: number;
    org?: string;
    domain?: string;
    type?: string;
    abuseScore?: number;
  };
} | null;
