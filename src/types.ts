export type Period = "7day" | "1month" | "3month" | "6month" | "12month" | "overall";

export interface Settings {
  lastfmUser: string;
  lastfmKey: string;
  discogsToken: string;
}

export interface TopArtist {
  name: string;
  playcount: number;
}

export interface DiscogsRelease {
  title: string;
  year?: number;
  thumb?: string;
  format?: string;
  url: string;
}
