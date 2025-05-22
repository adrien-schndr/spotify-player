import { Buffer } from "node:buffer";
import querystring from "npm:querystring";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const getAccessToken = async () => {
  const client_id = Deno.env.get("client_id");
  const client_secret = Deno.env.get("client_secret");
  const refresh_token = Deno.env.get("refresh_token");

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error("Spotify credentials (client_id, client_secret, refresh_token) are not set as environment variables in Val Town.");
  }

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response from Spotify token endpoint:", errorData);
      throw new Error(`Spotify token error: ${response.status} - ${errorData.error_description || response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error("Failed to get access token:", error.message);
    throw error;
  }
};

export default async function(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    const tokenData = await getAccessToken();
    return new Response(JSON.stringify({ access_token: tokenData.access_token }), { status: 200, headers });
  } catch (error: any) {
    console.error("Error in Val Town val:", error.message);
    return new Response(JSON.stringify({ error: "Failed to retrieve Spotify access token." }), { status: 500, headers });
  }
}