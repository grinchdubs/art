// When running in production (Docker), use relative URLs so nginx can proxy
// When running in development, use localhost:3002
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3002');

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Artworks API
export const artworkAPI = {
  getAll: async () => {
    return await apiCall('/api/artworks');
  },

  getById: async (id) => {
    return await apiCall(`/api/artworks/${id}`);
  },

  create: async (artwork) => {
    return await apiCall('/api/artworks', {
      method: 'POST',
      body: JSON.stringify(artwork),
    });
  },

  update: async (id, artwork) => {
    return await apiCall(`/api/artworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(artwork),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/artworks/${id}`, {
      method: 'DELETE',
    });
  },

  getLocationHistory: async (id) => {
    return await apiCall(`/api/artworks/${id}/location-history`);
  },

  addLocationHistory: async (id, location) => {
    return await apiCall(`/api/artworks/${id}/location-history`, {
      method: 'POST',
      body: JSON.stringify(location),
    });
  },

  updateTags: async (id, tagIds) => {
    return await apiCall(`/api/artworks/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  },

  bulkUpdate: async (ids, updates) => {
    return await apiCall('/api/artworks/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    });
  },
};

// Digital Works API
export const digitalWorkAPI = {
  getAll: async () => {
    return await apiCall('/api/digital-works');
  },

  getById: async (id) => {
    return await apiCall(`/api/digital-works/${id}`);
  },

  create: async (digitalWork) => {
    return await apiCall('/api/digital-works', {
      method: 'POST',
      body: JSON.stringify(digitalWork),
    });
  },

  update: async (id, digitalWork) => {
    return await apiCall(`/api/digital-works/${id}`, {
      method: 'PUT',
      body: JSON.stringify(digitalWork),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/digital-works/${id}`, {
      method: 'DELETE',
    });
  },

  updateTags: async (id, tagIds) => {
    return await apiCall(`/api/digital-works/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  },

  bulkUpdate: async (ids, updates) => {
    return await apiCall('/api/digital-works/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    });
  },
};

// Exhibitions API
export const exhibitionAPI = {
  getAll: async () => {
    return await apiCall('/api/exhibitions');
  },

  getById: async (id) => {
    return await apiCall(`/api/exhibitions/${id}`);
  },

  create: async (exhibition) => {
    return await apiCall('/api/exhibitions', {
      method: 'POST',
      body: JSON.stringify(exhibition),
    });
  },

  update: async (id, exhibition) => {
    return await apiCall(`/api/exhibitions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exhibition),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/exhibitions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Tags API
export const tagAPI = {
  getAll: async () => {
    return await apiCall('/api/tags');
  },

  getById: async (id) => {
    return await apiCall(`/api/tags/${id}`);
  },

  create: async (tag) => {
    return await apiCall('/api/tags', {
      method: 'POST',
      body: JSON.stringify(tag),
    });
  },

  update: async (id, tag) => {
    return await apiCall(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tag),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  },
};

// Series API
export const seriesAPI = {
  getAll: async () => {
    return await apiCall('/api/series');
  },

  getById: async (id) => {
    return await apiCall(`/api/series/${id}`);
  },

  create: async (series) => {
    return await apiCall('/api/series', {
      method: 'POST',
      body: JSON.stringify(series),
    });
  },

  update: async (id, series) => {
    return await apiCall(`/api/series/${id}`, {
      method: 'PUT',
      body: JSON.stringify(series),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/series/${id}`, {
      method: 'DELETE',
    });
  },
};

// Gallery API
export const galleryAPI = {
  getAll: async () => {
    return await apiCall('/api/gallery');
  },

  getById: async (id) => {
    return await apiCall(`/api/gallery/${id}`);
  },

  uploadSingle: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const url = `${API_BASE_URL}/api/gallery/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
    }

    return await response.json();
  },

  uploadBatch: async (files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    const url = `${API_BASE_URL}/api/gallery/upload/batch`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
    }

    return await response.json();
  },

  update: async (id, data) => {
    return await apiCall(`/api/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/gallery/${id}`, {
      method: 'DELETE',
    });
  },

  getArtworkImages: async (artworkId) => {
    return await apiCall(`/api/gallery/artwork/${artworkId}`);
  },

  getDigitalWorkImages: async (digitalWorkId) => {
    return await apiCall(`/api/gallery/digital-work/${digitalWorkId}`);
  },
};

// Public API (read-only, for public gallery)
export const publicAPI = {
  getArtworks: async () => {
    return await apiCall('/api/public/artworks');
  },

  getArtworkById: async (id) => {
    return await apiCall(`/api/public/artworks/${id}`);
  },

  getDigitalWorks: async () => {
    return await apiCall('/api/public/digital-works');
  },

  getDigitalWorkById: async (id) => {
    return await apiCall(`/api/public/digital-works/${id}`);
  },
};

// Analytics API
export const analyticsAPI = {
  getWorksOverTime: async () => {
    return await apiCall('/api/analytics/works-over-time');
  },

  getWorksByMedium: async () => {
    return await apiCall('/api/analytics/works-by-medium');
  },

  getStatusDistribution: async () => {
    return await apiCall('/api/analytics/status-distribution');
  },

  getPriceRanges: async () => {
    return await apiCall('/api/analytics/price-ranges');
  },

  getSummary: async () => {
    return await apiCall('/api/analytics/summary');
  },
};

// Helper to generate full image URLs
export function getImageURL(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return `${API_BASE_URL}${filePath}`;
}
