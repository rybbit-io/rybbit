// Connection endpoints
export {
  fetchGSCConnectionStatus,
  connectGSC,
  disconnectGSC,
} from "./connection";

export type {
  GSCConnectionStatus,
  GSCConnectResponse,
  GSCDisconnectResponse,
} from "./connection";

// Data endpoints
export { fetchGSCData } from "./data";
export type { GSCDimension, GSCData, GSCDataParams } from "./data";
