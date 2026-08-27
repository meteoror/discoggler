import "./style.css";
import type { Period, TopArtist, DiscogsRelease } from "./types";
import { fetchTopArtists } from "./lastfm";
import { searchVinylForArtist, sleep } from "./discogs";
import { loadSettings, saveSettings } from "./settings";

const MAX_ARTISTS = 25; // keeps total Discogs requests bounded
const RELEASES_PER_ARTIST = 4;
const DISCOGS_DELAY_MS = 1100; // stay comfortably under Discogs' rate limit

const app = document.querySelector<HTMLDivElement>("#app")!;
const settings = loadSettings();

app.innerHTML = `
  <main>
    <header>
      <h1>Vinyl Finder</h1>
      <p class="subtitle">Your most-listened Last.fm artists, matched against Discogs vinyl listings.</p>
    </header>

    <section class="card">
      <h2>Accounts</h2>
      <div class="field">
        <label for="lastfmUser">Last.fm username</label>
        <input id="lastfmUser" type="text" autocomplete="off" />
      </div>
      <div class="field">
        <label for="lastfmKey">Last.fm API key</label>
        <input id="lastfmKey" type="text" autocomplete="off" />
      </div>
      <div class="field">
        <label for="discogsToken">Discogs personal access token</label>
        <input id="discogsToken" type="text" autocomplete="off" />
      </div>
      <button id="saveSettings" type="button">Save</button>
      <p class="hint">
        Stored only in this browser's local storage. Get a Last.fm key at
        <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener">last.fm/api</a>
        and a Discogs token under Settings &rarr; Developers on
        <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noopener">discogs.com</a>.
      </p>
    </section>

    <section class="card">
      <h2>Search</h2>
      <div class="field">
        <label for="period">Time period</label>
        <select id="period">
          <option value="7day">Last 7 days</option>
          <option value="1month">Last month</option>
          <option value="3month">Last 3 months</option>
          <option value="6month">Last 6 months</option>
          <option value="12month">Last 12 months</option>
          <option value="overall">All time</option>
        </select>
      </div>
      <div class="field">
        <label for="format">Discogs format</label>
        <select id="format">
          <option value="Vinyl">Vinyl (any)</option>
          <option value="7&quot;">7" single</option>
          <option value="LP">LP</option>
          <option value="12&quot;">12"</option>
        </select>
      </div>
      <button id="run" type="button">Find vinyl</button>
    </section>

    <p id="status" class="status" role="status"></p>
    <div id="results"></div>
  </main>
`;

const userInput = document.querySelector<HTMLInputElement>("#lastfmUser")!;
const keyInput = document.querySelector<HTMLInputElement>("#lastfmKey")!;
const tokenInput = document.querySelector<HTMLInputElement>("#discogsToken")!;
const periodSelect = document.querySelector<HTMLSelectElement>("#period")!;
const formatSelect = document.querySelector<HTMLSelectElement>("#format")!;
const saveBtn = document.querySelector<HTMLButtonElement>("#saveSettings")!;
const runBtn = document.querySelector<HTMLButtonElement>("#run")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const resultsEl = document.querySelector<HTMLDivElement>("#results")!;

userInput.value = settings.lastfmUser;
keyInput.value = settings.lastfmKey;
tokenInput.value = settings.discogsToken;

saveBtn.addEventListener("click", () => {
  saveSettings({
    lastfmUser: userInput.value.trim(),
    lastfmKey: keyInput.value.trim(),
    discogsToken: tokenInput.value.trim(),
  });
  setStatus("Settings saved.");
});

runBtn.addEventListener("click", () => {
  void run();
});

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function clearResults(): void {
  resultsEl.innerHTML = "";
}

function renderArtistBlock(artist: TopArtist, releases: DiscogsRelease[]): void {
  const block = document.createElement("section");
  block.className = "artist-block";

  const heading = document.createElement("h3");
  heading.textContent = `${artist.name} (${artist.playcount} plays)`;
  block.appendChild(heading);

  if (releases.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No matching vinyl found.";
    block.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "release-list";
    for (const release of releases) {
      const item = document.createElement("li");

      if (release.thumb) {
        const img = document.createElement("img");
        img.src = release.thumb;
        img.alt = "";
        img.loading = "lazy";
        item.appendChild(img);
      }

      const link = document.createElement("a");
      link.href = release.url;
      link.target = "_blank";
      link.rel = "noopener";
      const details = [release.year, release.format].filter(Boolean).join(" · ");
      link.textContent = details ? `${release.title} (${details})` : release.title;
      item.appendChild(link);

      list.appendChild(item);
    }
    block.appendChild(list);
  }

  resultsEl.appendChild(block);
}

async function run(): Promise<void> {
  const user = userInput.value.trim();
  const key = keyInput.value.trim();
  const token = tokenInput.value.trim();
  const period = periodSelect.value as Period;
  const format = formatSelect.value;

  if (!user || !key || !token) {
    setStatus("Fill in your Last.fm username/key and Discogs token first.");
    return;
  }

  runBtn.disabled = true;
  clearResults();

  try {
    setStatus("Fetching your top tracks from Last.fm…");
    const artists = (await fetchTopArtists(user, key, period, 100)).slice(0, MAX_ARTISTS);

    if (artists.length === 0) {
      setStatus("No tracks found for that period.");
      return;
    }

    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      setStatus(`Searching Discogs for "${artist.name}" (${i + 1}/${artists.length})…`);

      try {
        const releases = await searchVinylForArtist(artist.name, format, token, RELEASES_PER_ARTIST);
        renderArtistBlock(artist, releases);
      } catch (err) {
        renderArtistBlock(artist, []);
        console.error(`Discogs lookup failed for ${artist.name}`, err);
      }

      if (i < artists.length - 1) {
        await sleep(DISCOGS_DELAY_MS);
      }
    }

    setStatus(`Done. Matched ${artists.length} artists.`);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    runBtn.disabled = false;
  }
}
