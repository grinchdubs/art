// Immich Integration Utility
// Connects to Immich server via backend proxy

/**
 * Fetch all assets from Immich with pagination
 */
export async function fetchImmichAssets(page = 1, limit = 100) {
  try {
    const response = await fetch(`/api/immich/assets?take=${limit}&skip=${(page - 1) * limit}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Immich API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Immich assets:', error);
    throw error;
  }
}

/**
 * Search Immich assets by metadata
 */
export async function searchImmichAssets(query) {
  try {
    const response = await fetch(`/api/immich/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ q: query })
    });

    if (!response.ok) {
      throw new Error(`Immich search error: ${response.status}`);
    }

    const data = await response.json();
    // Backend now returns array directly
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error searching Immich:', error);
    throw error;
  }
}

/**
 * Get thumbnail URL for an Immich asset
 */
export function getImmichThumbnailUrl(assetId) {
  return `/api/immich/thumbnail/${assetId}`;
}

/**
 * Get full-size image URL for an Immich asset
 */
export function getImmichImageUrl(assetId) {
  return `/api/immich/download/${assetId}`;
}

/**
 * Download an image from Immich and convert to File object
 * This will be proxied through our backend to handle CORS
 */
export async function downloadImmichImage(assetId, filename) {
  try {
    console.log(`Downloading image ${assetId}...`);
    // Use our backend proxy to download the image
    const response = await fetch(`/api/immich/download/${assetId}`, {
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download failed:', response.status, errorText);
      throw new Error(`Failed to download image: ${response.status}`);
    }

    console.log(`Converting to blob...`);
    const blob = await response.blob();
    console.log(`Downloaded ${blob.size} bytes`);
    
    // Create a File object from the blob
    const file = new File([blob], filename || `immich-${assetId}.jpg`, {
      type: blob.type || 'image/jpeg'
    });

    return file;
  } catch (error) {
    console.error('Error downloading Immich image:', error);
    throw error;
  }
}

/**
 * Fetch albums from Immich
 */
export async function fetchImmichAlbums() {
  try {
    const response = await fetch(`/api/immich/albums`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Immich albums error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Immich albums:', error);
    throw error;
  }
}

/**
 * Fetch assets from a specific album
 */
export async function fetchAlbumAssets(albumId) {
  try {
    const response = await fetch(`/api/immich/albums/${albumId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Immich album assets error: ${response.status}`);
    }

    const data = await response.json();
    return data.assets || [];
  } catch (error) {
    console.error('Error fetching album assets:', error);
    throw error;
  }
}

/**
 * Get asset metadata
 */
export async function getAssetMetadata(assetId) {
  try {
    const response = await fetch(`/api/immich/assets/${assetId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Immich asset metadata error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching asset metadata:', error);
    throw error;
  }
}
