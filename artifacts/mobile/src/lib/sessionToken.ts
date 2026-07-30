const STORAGE_KEY = "kt_session_token";

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getSessionToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export async function clearSessionToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
