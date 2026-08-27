import type { Period, TopArtist } from "./types";

const LASTFM_ROOT = "https://ws.audioscrobbler.com/2.0/";

interface LastfmTrack {
  artist: { name: string };
  playcount: string;
}

interface LastfmTopTracksResponse {
  toptracks?: {
    track: LastfmTrack[];
  };
  error?: number;
  message?: string;
}

/**
 * Fetches the user's most-listened-to tracks for a given period and
 * collapses them into a de-duplicated, playcount-ranked list of artists.
 */
export async function fetchTopArtists(
  user: string,
  apiKey: string,
  period: Period,
  trackLimit: number
): Promise<TopArtist[]> {
  const url = new URL(LASTFM_ROOT);
  url.searchParams.set("method", "user.gettoptracks");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(trackLimit));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Last.fm request failed (${res.status})`);
  }

  const data = (await res.json()) as LastfmTopTracksResponse;
  if (data.error) {
    throw new Error(data.message ?? "Last.fm returned an error");
  }

  const tracks = data.toptracks?.track ?? [];
  const byArtist = new Map<string, number>();

  for (const track of tracks) {
    const name = track.artist.name;
    const plays = Number(track.playcount) || 0;
    byArtist.set(name, (byArtist.get(name) ?? 0) + plays);
  }

  return Array.from(byArtist.entries())
    .map(([name, playcount]) => ({ name, playcount }))
    .sort((a, b) => b.playcount - a.playcount);
}
