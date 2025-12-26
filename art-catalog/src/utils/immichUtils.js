// Immich Integration Utility
// Connects to Immich server to browse and import photos

const IMMICH_SERVER = 'http://grnchnas:30041';
const IMMICH_API_KEY = 'XvAiawr3Ht7yWBfO4ldjNgp1b2eIW1b3zI5X2Ecck';

/**
 * Fetch all assets from Immich with pagination
 */
export async function fetchImmichAssets(page = 1, limit = 100) {
  try {
    const response = await fetch(`${IMMICH_SERVER}/api/asset?take=${limit}&skip=${(page - 1) * limit}`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
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
    const response = await fetch(`${IMMICH_SERVER}/api/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        type: 'IMAGE'
      })
    });

    if (!response.ok) {
      throw new Error(`Immich search error: ${response.status}`);
    }

    const data = await response.json();
    return data.assets?.items || [];
  } catch (error) {
    console.error('Error searching Immich:', error);
    throw error;
  }
}

/**
 * Get thumbnail URL for an Immich asset
 */
export function getImmichThumbnailUrl(assetId) {
  return `${IMMICH_SERVER}/api/asset/thumbnail/${assetId}?size=preview`;
}

/**
 * Get full-size image URL for an Immich asset
 */
export function getImmichImageUrl(assetId) {
  return `${IMMICH_SERVER}/api/asset/file/${assetId}`;
}

/**
 * Download an image from Immich and convert to File object
 * This will be proxied through our backend to handle CORS
 */
export async function downloadImmichImage(assetId, filename) {
  try {
    // Use our backend proxy to download the image
    const response = await fetch(`/api/immich/download/${assetId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const blob = await response.blob();
    
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
    const response = await fetch(`${IMMICH_SERVER}/api/album`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
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
    const response = await fetch(`${IMMICH_SERVER}/api/album/${albumId}`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
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
    const response = await fetch(`${IMMICH_SERVER}/api/asset/${assetId}`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
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
