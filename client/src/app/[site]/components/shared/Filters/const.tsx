import { FilterParameter } from "@rybbit/shared";
import {
  AppWindow,
  Brain,
  Bug,
  Building,
  Clock,
  FileText,
  Flag,
  FolderInput,
  Globe,
  Hotel,
  Languages,
  Link,
  LogIn,
  LogOut,
  MapPin,
  MapPinHouse,
  MapPinned,
  Maximize,
  Megaphone,
  MousePointerClick,
  Puzzle,
  Radio,
  Search,
  Server,
  Shield,
  TabletSmartphone,
  Tag,
  Target,
  User,
} from "lucide-react";
import React from "react";

export const FilterOptions: {
  label: string;
  value: FilterParameter;
  icon: React.ReactNode;
  cloudOnly?: boolean;
}[] = [
  {
    label: "Path",
    value: "pathname",
    icon: <FolderInput className="h-4 w-4" />,
  },
  {
    label: "Page Title",
    value: "page_title",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Query",
    value: "querystring",
    icon: <Search className="h-4 w-4" />,
  },
  {
    label: "Hostname",
    value: "hostname",
    icon: <Hotel className="h-4 w-4" />,
  },
  {
    label: "User ID",
    value: "user_id",
    icon: <User className="h-4 w-4" />,
  },
  {
    label: "Event Name",
    value: "event_name",
    icon: <MousePointerClick className="h-4 w-4" />,
  },
  {
    label: "Referrer",
    value: "referrer",
    icon: <Link className="h-4 w-4" />,
  },
  {
    label: "Channel",
    value: "channel",
    icon: <Radio className="h-4 w-4" />,
  },
  {
    label: "Entry Page",
    value: "entry_page",
    icon: <LogIn className="h-4 w-4" />,
  },
  {
    label: "Exit Page",
    value: "exit_page",
    icon: <LogOut className="h-4 w-4" />,
  },
  {
    label: "Country",
    value: "country",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    label: "Region",
    value: "region",
    icon: <MapPinned className="h-4 w-4" />,
  },
  {
    label: "City",
    value: "city",
    icon: <MapPinHouse className="h-4 w-4" />,
  },
  {
    label: "Device Type",
    value: "device_type",
    icon: <TabletSmartphone className="h-4 w-4" />,
  },
  {
    label: "Operating System",
    value: "operating_system",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    label: "Operating System Version",
    value: "operating_system_version",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    label: "Browser",
    value: "browser",
    icon: <AppWindow className="h-4 w-4" />,
  },
  {
    label: "Browser Version",
    value: "browser_version",
    icon: <AppWindow className="h-4 w-4" />,
  },
  {
    label: "Language",
    value: "language",
    icon: <Languages className="h-4 w-4" />,
  },
  {
    label: "Screen Dimensions",
    value: "dimensions",
    icon: <Maximize className="h-4 w-4" />,
  },
  {
    label: "UTM Source",
    value: "utm_source",
    icon: <Target className="h-4 w-4" />,
  },
  {
    label: "UTM Medium",
    value: "utm_medium",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    label: "UTM Campaign",
    value: "utm_campaign",
    icon: <Flag className="h-4 w-4" />,
  },
  {
    label: "UTM Content",
    value: "utm_content",
    icon: <Puzzle className="h-4 w-4" />,
  },
  {
    label: "UTM Term",
    value: "utm_term",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    label: "Lat",
    value: "lat",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    label: "Lon",
    value: "lon",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    label: "Timezone",
    value: "timezone",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    label: "VPN",
    value: "vpn",
    icon: <Shield className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "Crawler",
    value: "crawler",
    icon: <Bug className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "Datacenter",
    value: "datacenter",
    icon: <Server className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "Company",
    value: "company",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "Company Type",
    value: "company_type",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "Company Domain",
    value: "company_domain",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "ASN Org",
    value: "asn_org",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "ASN Type",
    value: "asn_type",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
  {
    label: "ASN Domain",
    value: "asn_domain",
    icon: <Building className="h-4 w-4" />,
    cloudOnly: true,
  },
];

export const OperatorOptions = [
  { label: "Is", value: "equals" },
  { label: "Is not", value: "not_equals" },
  { label: "Contains", value: "contains" },
  { label: "Not contains", value: "not_contains" },
];
