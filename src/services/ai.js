import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
// User specified 2.5, using 2.5-flash as the closest valid identifier if 2.5 fails
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

/**
 * Uses Gemini to suggest songs based on a mood string.
 * Returns an array of { title, artist }
 */
export async function getGeminiProactivePlaylist(mood) {
  if (!model) {
    console.error("Gemini API key missing!");
    return [];
  }

  const prompt = `Suggest 10 popular, real songs that match the mood: "${mood}". 
  Return ONLY a valid JSON array of objects with "title" and "artist" keys. 
  Example: [{"title": "Song Name", "artist": "Artist Name"}]
  Do not include any other text or explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up markdown if AI included it
    if (text.includes("```")) {
      text = text.split("```")[1].replace("json", "").trim();
    }

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}

/**
 * Searches YouTube for a song and returns the first video URL and metadata.
 */
/**
 * Uses Gemini to create a personalized playlist from a free-text mood description.
 * Takes user context (liked artists, recently played) for better recommendations.
 * Returns an array of { title, artist }
 */
export async function getMoodPlaylist(moodDescription, userContext = {}) {
  if (!model) {
    console.error("Gemini API key missing!");
    return [];
  }

  const { likedArtists = [], recentSongs = [], favoriteGenres = [] } = userContext;

  let contextBlock = '';
  if (likedArtists.length > 0) {
    contextBlock += `\nThe user frequently listens to these artists: ${likedArtists.slice(0, 8).join(', ')}.`;
  }
  if (recentSongs.length > 0) {
    contextBlock += `\nRecently played songs: ${recentSongs.slice(0, 5).map(s => `"${s.title}" by ${s.artist}`).join(', ')}.`;
  }
  if (favoriteGenres.length > 0) {
    contextBlock += `\nFavorite genres: ${favoriteGenres.join(', ')}.`;
  }

  const prompt = `You are a music curator AI. A user described their current mood as: "${moodDescription}"
${contextBlock}

Based on this mood and their music taste, suggest 10 real, popular songs that perfectly match how they feel.
Prioritize songs from artists they already like or similar artists, but also include a couple fresh discoveries.
Also, generate a catchy, creative title for this playlist, and a single word or short phrase that describes the visual aesthetic for the cover art (e.g. "neon lights", "rainy window", "sunset beach").

Return ONLY a valid JSON object with the following structure:
{
  "playlistTitle": "String",
  "coverSearchTerm": "String",
  "songs": [{"title": "Song Name", "artist": "Artist Name"}]
}
Do not include any other text or explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Attempt to extract JSON from markdown or raw text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseError) {
      console.error("Gemini JSON Parse Error:", parseError, "Original text:", text);
      // Fallback
      return { playlistTitle: `${moodDescription} Vibes`, coverSearchTerm: moodDescription, songs: [] };
    }
  } catch (error) {
    console.error("Gemini Mood Parse Error:", error);
    return { playlistTitle: `${moodDescription} Vibes`, coverSearchTerm: moodDescription, songs: [] };
  }
}

export async function searchYouTube(query) {
  if (!YOUTUBE_KEY) return null;
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&maxResults=1&key=${YOUTUBE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        cover_url: item.snippet.thumbnails.high.url,
        audio_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        artist: item.snippet.channelTitle
      };
    }
  } catch (error) {
    console.error("YouTube Search Error:", error);
  }
  return null;
}
