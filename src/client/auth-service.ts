import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { UserData, MediaListStatus } from "../index";
import { gql, useQuery } from "@apollo/client";

// COnstants for Anilist Oauth, ideally should be loaded from environmental variables
const clientId = import.meta.env.VITE_CLIENT_ID || "default_client_id";
const clientSecret =
  import.meta.env.VITE_CLIENT_SECRET || "default_client_secret";
const redirectUri = import.meta.env.VITE_REDIRECT_URI || "default_redirect_uri";

/**
 * Generates a new CSRF token for each session
 *  @returns {string} a UUID v4 CSRF token
 */
export const generateCsrfToken = (): string => {
  return uuidv4();
};

/**
 * Builds the authorization URL with CSRF protection
 * @param {string} csrfToken CSRF token for state parameter
 * @returns {string} URL to redirect user to Anilist OAuth login page
 */

// authService.ts
export const buildAuthUrl = (csrfToken: string): string => {
  const scope = encodeURIComponent("");
  const state = encodeURIComponent(csrfToken);
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  return `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${encodedRedirectUri}&state=${state}`;
};

/**
 * Requests an access token from anilist using the authorization code
 * @param {string} code the authorization code received from Anilist user consent
 * @returns {Promise<string>} A promise that resolves to the access token
 */

export const getAccessToken = async (code: string): Promise<string> => {
  const url = "https://anilist.co/api/v2/oauth/token";
  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };

  try {
    const response = await axios.post(url, payload);

    if (response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error("Access token not found in the response");
    }
  } catch (error) {
    console.error("Error obtaining token:", error);
    throw new Error("Failed to obtain access token");
  }
};

// src/services/authService.js
export const fetchUserData = async (accessToken: string): Promise<UserData> => {
  try {
    const response = await axios.post(
      "https://graphql.anilist.co",
      {
        query: `
          query {
              Viewer {
                  id
                  name
                  avatar {
                      large
                  }
                  statistics {
                      anime {
                          count
                          episodesWatched
                          meanScore
                          minutesWatched
                      }
                  }
              }
          }
      `,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data.Viewer;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw new Error("Failed to fetch user data");
  }
};

const GET_USER_ANIME_LIST = gql`
  query GetUserAnimeList($username: String!, $status: MediaListStatus!) {
    MediaListCollection(
      userName: $usename
      type: ANIME
      status: $status
      sort: UPDATE_TIME_DESC
    ) {
      lists {
        entries {
          media {
            id
            format
            title {
              romaji
              english
            }
            coverImage {
              large
              color
            }
            status
            episodes
            startDate {
              year
              month
              day
            }
            averageScore
            genres
          }
        }
      }
    }
  }
`;

export const useUserAnimeList = (username: string, status: MediaListStatus) => {
  const { data, loading, error } = useQuery(GET_USER_ANIME_LIST, {
    variables: { username, status },
    skip: !username || !status,
  });

  return {
    animeList: data?.MediaListStatus,
    loading,
    error,
  };
};
