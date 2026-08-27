import type { DiscogsRelease } from "./types";

const DISCOGS_ROOT = "https://api.discogs.com/database/search";

interface DiscogsResult {
  title: string;
  year?: string;
  thumb?: string;
  format?: string[];
  uri: string;
}

interface DiscogsSearchResponse {
  results?: DiscogsResult[];
  message?: string;
}

/**
 * Searches Discogs for vinyl releases by a given artist.
 * `format` should be a Discogs format string, e.g. "Vinyl" or "7\"".
 */
export async function searchVinylForArtist(
  artist: string,
  format: string,
  token: string,
  perArtistLimit: number
): Promise<DiscogsRelease[]> {
  const url = new URL(DISCOGS_ROOT);
  url.searchParams.set("artist", artist);
  url.searchParams.set("type", "release");
  url.searchParams.set("format", format);
  url.searchParams.set("per_page", String(perArtistLimit));
  url.searchParams.set("page", "1");
  url.searchParams.set("token", token);

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Discogs rate limit hit — slow down and try again shortly.");
    }
    throw new Error(`Discogs request failed (${res.status})`);
  }

  const data = (await res.json()) as DiscogsSearchResponse;

  return (data.results ?? []).map((r) => ({
    title: r.title,
    year: r.year ? Number(r.year) : undefined,
    thumb: r.thumb || undefined,
    format: r.format?.join(", "),
    url: `https://www.discogs.com${r.uri}`,
  }));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
