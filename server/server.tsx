import { Buffer } from "node:buffer";
import querystring from "npm:querystring";

const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const client_id = Deno.env.get("client_id");
const client_secret = Deno.env.get("client_secret");
const refresh_token = Deno.env.get("refresh_token");

const getAccessToken = async (client_id, client_secret, refresh_token) => {
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  return response.json();
};

const getNowPlaying = async () => {
  try {
    const { access_token } = await getAccessToken(client_id, client_secret, refresh_token);

    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.status > 400) {
      const shortenedName = "Error (Forbidden)";
      const image = "/assets/spotify.svg";
      return { shortenedName, image };
    } else if (response.status === 204) {
      const shortenedName = "Currently Not Playing";
      const image = "/assets/spotify.svg";
      return { shortenedName, image };
    }

    const song = await response.json();
    const progress_ms = song.progress_ms;
    const duration_ms = song.item.duration_ms;
    const image = song.item.album.images[0].url;
    const artistNames = song.item.artists.map(a => a.name);
    const artistLinks = song.item.artists.map(a => a.external_urls.spotify);
    const link = song.item.external_urls.spotify;
    const name = song.item.name;
    const shortenedName = (name.length > 30 ? name.replace(/\[[^\]]*\]/g, "").trim() : name).length > 30
      ? name.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim()
      : name;
    const artistLink = song.item.album.artists[0].external_urls.spotify;

    return {
      duration_ms,
      progress_ms,
      shortenedName,
      link,
      artistNames,
      artistLinks,
      image,
    };
  } catch (error) {
    const shortenedName = "Error";
    const image = "/assets/spotify.svg";
    return { shortenedName, image };
  }
};

export const NowPlaying = async () => Response.json(await getNowPlaying());