import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getApiOrigin } from "./apiConfig";
import { getSessionToken } from "./sessionToken";

let configured = false;

export function configureApiClient() {
  const origin = getApiOrigin();
  if (origin) setBaseUrl(origin);
  setAuthTokenGetter(() => getSessionToken());
}

export function ensureApiClientConfigured() {
  if (configured) return;
  configureApiClient();
  configured = true;
}
