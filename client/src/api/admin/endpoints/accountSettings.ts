import { authedFetch } from "../../utils";

export interface UpdateAccountSettingsRequest {
  sendAutoEmailReports?: boolean;
  // Add more settings here in the future
}

export interface UpdateAccountSettingsResponse {
  success: boolean;
  settings: {
    sendAutoEmailReports: boolean;
    // Add more settings here as they're added
  };
}

export function updateAccountSettings(settings: UpdateAccountSettingsRequest) {
  return authedFetch<UpdateAccountSettingsResponse>("/user/account-settings", undefined, {
    method: "POST",
    data: settings,
  });
}
