// Video URL import utilities for digital works

/**
 * Extract video ID from YouTube URL
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract video ID from Vimeo URL
 */
function extractVimeoId(url) {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/channels\/[\w-]+\/(\d+)/,
    /vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get embed URL for a video
 */
function getEmbedUrl(url) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  return null;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  values.push(currentValue.trim());
  return values;
}

/**
 * Fetch video metadata from Vimeo API using oEmbed (no auth required)
 */
async function fetchVimeoMetadata(videoId) {
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Vimeo data');
    }
    const data = await response.json();
    return {
      title: data.title || null,
      thumbnail: data.thumbnail_url || null,
    };
  } catch (error) {
    console.error('Error fetching Vimeo metadata:', error);
    return { title: null, thumbnail: null };
  }
}

/**
 * Fetch video metadata from YouTube API using oEmbed (no auth required)
 */
async function fetchYouTubeMetadata(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok) {
      throw new Error('Failed to fetch YouTube data');
    }
    const data = await response.json();
    return {
      title: data.title || null,
      thumbnail: data.thumbnail_url || null,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return { title: null, thumbnail: null };
  }
}

/**
 * Parse a list of video URLs (one per line) or CSV format with URL,Title
 */
export function parseVideoUrls(text) {
  const lines = text.trim().split('\n');
  const videos = [];
  const errors = [];

  // Check if first line is CSV header
  const isCSV = lines[0] && lines[0].toLowerCase().includes('url') && lines[0].toLowerCase().includes('title');
  const startIndex = isCSV ? 1 : 0;

  lines.slice(startIndex).forEach((line, index) => {
    const lineNum = index + 1 + startIndex;
    if (!line.trim()) return; // Skip empty lines

    let url, customTitle;

    // Try to parse as CSV first
    if (line.includes(',')) {
      const parts = parseCSVLine(line);
      url = parts[0];
      customTitle = parts[1] && parts[1].trim() ? parts[1].trim() : null;
      console.log('Parsed CSV line:', { url, customTitle, parts });
    } else {
      url = line.trim();
      customTitle = null;
    }

    const youtubeId = extractYouTubeId(url);
    const vimeoId = extractVimeoId(url);

    if (!youtubeId && !vimeoId) {
      errors.push({
        line: lineNum,
        url: url,
        message: 'Not a valid YouTube or Vimeo URL'
      });
      return;
    }

    const platform = youtubeId ? 'YouTube' : 'Vimeo';
    const videoId = youtubeId || vimeoId;
    const embedUrl = getEmbedUrl(url);

    // Use custom title if provided, otherwise generate from ID
    const title = customTitle || `${platform} Video ${videoId}`;

    videos.push({
      title: title,
      file_format: 'Video',
      platform: platform,
      video_url: url,
      embed_url: embedUrl,
      video_id: videoId,
      sale_status: 'available',
      notes: `Imported from ${platform}`,
      needsTitleFetch: !customTitle, // Flag to fetch title later
    });
  });

  return { videos, errors };
}

/**
 * Fetch metadata (title and thumbnail) for videos that need them
 */
export async function fetchVideoTitles(videos) {
  const videosWithMetadata = [];

  for (const video of videos) {
    if (video.needsTitleFetch) {
      let metadata = { title: null, thumbnail: null };

      if (video.platform === 'Vimeo') {
        metadata = await fetchVimeoMetadata(video.video_id);
      } else if (video.platform === 'YouTube') {
        metadata = await fetchYouTubeMetadata(video.video_id);
      }

      if (metadata.title) {
        video.title = metadata.title;
        video.notes = `${metadata.title} - Imported from ${video.platform}`;
      }

      if (metadata.thumbnail) {
        video.thumbnail_url = metadata.thumbnail;
      }

      delete video.needsTitleFetch;
    }

    videosWithMetadata.push(video);
  }

  return videosWithMetadata;
}

/**
 * Generate example text for video URL import
 */
export function getVideoImportExample() {
  return `URL,Title
https://vimeo.com/123456789,"My Video Title"
https://www.youtube.com/watch?v=dQw4w9WgXcQ,"Another Video"

Or paste URLs only (one per line):
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://vimeo.com/123456789`;
}

/**
 * Check if a URL is a video URL
 */
export function isVideoUrl(url) {
  return extractYouTubeId(url) !== null || extractVimeoId(url) !== null;
}

/**
 * Get embed URL for displaying in iframe
 */
export function getVideoEmbedUrl(url) {
  return getEmbedUrl(url);
}

/**
 * Get thumbnail URL for a video (synchronous, best-effort)
 */
export function getVideoThumbnailUrl(url) {
  // For YouTube, we can generate thumbnail URLs directly
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    // Use maxresdefault for highest quality, fallback to hqdefault
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  // For Vimeo, construct the thumbnail URL using Vimeo's oembed endpoint
  // We'll use a data URI approach to fetch it client-side
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    // Return a special marker that the component can detect and fetch async
    return `vimeo:${vimeoId}`;
  }

  return null;
}

/**
 * Fetch Vimeo thumbnail URL asynchronously
 */
export async function fetchVimeoThumbnail(videoId) {
  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Vimeo thumbnail');
    }
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error);
    return null;
  }
}
