import type { Settings } from "./types";

const STORAGE_KEY = "vinyl-finder-settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastfmUser: "", lastfmKey: "", discogsToken: "" };
    return JSON.parse(raw) as Settings;
  } catch {
    return { lastfmUser: "", lastfmKey: "", discogsToken: "" };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
