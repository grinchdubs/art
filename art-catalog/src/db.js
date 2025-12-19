import Dexie from 'dexie';

// Initialize the database
export const db = new Dexie('ArtCatalogDB');

// Define database schema
// Version 1: Initial schema with artworks only
db.version(1).stores({
  artworks: '++id, inventory_number, title, creation_date, medium, series_name, sale_status, location',
  exhibitions: '++id, name, venue, start_date',
  artwork_exhibitions: '[artwork_id+exhibition_id], artwork_id, exhibition_id',
  location_history: '++id, artwork_id, moved_date',
});

// Version 2: Add file_references table
db.version(2).stores({
  artworks: '++id, inventory_number, title, creation_date, medium, series_name, sale_status, location',
  file_references: '++id, artwork_id, file_path, file_type, is_primary',
  exhibitions: '++id, name, venue, start_date',
  artwork_exhibitions: '[artwork_id+exhibition_id], artwork_id, exhibition_id',
  location_history: '++id, artwork_id, moved_date',
});

// Version 3: Add price field to artworks
db.version(3).stores({
  artworks: '++id, inventory_number, title, creation_date, medium, series_name, sale_status, location, price',
  file_references: '++id, artwork_id, file_path, file_type, is_primary',
  exhibitions: '++id, name, venue, start_date',
  artwork_exhibitions: '[artwork_id+exhibition_id], artwork_id, exhibition_id',
  location_history: '++id, artwork_id, moved_date',
});

// Version 4: Add digital_works table
db.version(4).stores({
  artworks: '++id, inventory_number, title, creation_date, medium, series_name, sale_status, location, price',
  file_references: '++id, artwork_id, file_path, file_type, is_primary',
  exhibitions: '++id, name, venue, start_date',
  artwork_exhibitions: '[artwork_id+exhibition_id], artwork_id, exhibition_id',
  location_history: '++id, artwork_id, moved_date',
  digital_works: '++id, inventory_number, title, creation_date, file_format, file_size, dimensions, sale_status, price, license_type',
  digital_file_references: '++id, digital_work_id, file_path, file_type, is_primary',
});

// Version 5: Add digital_work_exhibitions table
db.version(5).stores({
  artworks: '++id, inventory_number, title, creation_date, medium, series_name, sale_status, location, price',
  file_references: '++id, artwork_id, file_path, file_type, is_primary',
  exhibitions: '++id, name, venue, start_date',
  artwork_exhibitions: '[artwork_id+exhibition_id], artwork_id, exhibition_id',
  location_history: '++id, artwork_id, moved_date',
  digital_works: '++id, inventory_number, title, creation_date, file_format, file_size, dimensions, sale_status, price, license_type',
  digital_file_references: '++id, digital_work_id, file_path, file_type, is_primary',
  digital_work_exhibitions: '[digital_work_id+exhibition_id], digital_work_id, exhibition_id',
});

// Artwork operations
export const artworkOperations = {
  create: async (artwork) => {
    const id = await db.artworks.add({
      ...artwork,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { id, ...artwork };
  },

  getAll: async () => {
    return await db.artworks.toArray();
  },

  getById: async (id) => {
    return await db.artworks.get(Number(id));
  },

  update: async (id, artwork) => {
    await db.artworks.update(Number(id), {
      ...artwork,
      updated_at: new Date().toISOString(),
    });
    return { id, ...artwork };
  },

  delete: async (id) => {
    await db.artworks.delete(Number(id));
  },
};

// File reference operations
export const fileOperations = {
  addFile: async (artworkId, filePath, fileType, isPrimary = false) => {
    console.log('fileOperations.addFile called with:', { artworkId, fileType, isPrimary, filePathLength: filePath?.length });
    try {
      const result = await db.file_references.add({
        artwork_id: artworkId,
        file_path: filePath,
        file_type: fileType,
        is_primary: isPrimary ? 1 : 0,
        created_at: new Date().toISOString(),
      });
      console.log('fileOperations.addFile success, returned ID:', result);
      return result;
    } catch (error) {
      console.error('fileOperations.addFile error:', error);
      throw error;
    }
  },

  getFilesForArtwork: async (artworkId) => {
    return await db.file_references
      .where('artwork_id')
      .equals(Number(artworkId))
      .toArray();
  },

  setPrimaryFile: async (fileId, artworkId) => {
    // Unset all primary flags for this artwork
    const files = await db.file_references
      .where('artwork_id')
      .equals(Number(artworkId))
      .toArray();

    for (const file of files) {
      await db.file_references.update(file.id, { is_primary: 0 });
    }

    // Set the new primary
    await db.file_references.update(Number(fileId), { is_primary: 1 });
  },

  deleteFile: async (id) => {
    await db.file_references.delete(Number(id));
  },
};

// Exhibition operations
export const exhibitionOperations = {
  create: async (exhibition) => {
    const id = await db.exhibitions.add({
      ...exhibition,
      created_at: new Date().toISOString(),
    });
    return { id, ...exhibition };
  },

  getAll: async () => {
    return await db.exhibitions.orderBy('start_date').reverse().toArray();
  },

  getById: async (id) => {
    return await db.exhibitions.get(Number(id));
  },

  update: async (id, exhibition) => {
    await db.exhibitions.update(Number(id), {
      ...exhibition,
      updated_at: new Date().toISOString(),
    });
    return { id, ...exhibition };
  },

  delete: async (id) => {
    // Delete the exhibition
    await db.exhibitions.delete(Number(id));
    // Delete all artwork-exhibition links
    const links = await db.artwork_exhibitions
      .where('exhibition_id')
      .equals(Number(id))
      .toArray();
    for (const link of links) {
      await db.artwork_exhibitions.delete([link.artwork_id, link.exhibition_id]);
    }
  },

  addArtworkToExhibition: async (artworkId, exhibitionId) => {
    await db.artwork_exhibitions.put({
      artwork_id: Number(artworkId),
      exhibition_id: Number(exhibitionId),
    });
  },

  getExhibitionsForArtwork: async (artworkId) => {
    const links = await db.artwork_exhibitions
      .where('artwork_id')
      .equals(Number(artworkId))
      .toArray();

    const exhibitions = [];
    for (const link of links) {
      const exhibition = await db.exhibitions.get(link.exhibition_id);
      if (exhibition) exhibitions.push(exhibition);
    }

    return exhibitions;
  },

  getArtworksForExhibition: async (exhibitionId) => {
    const links = await db.artwork_exhibitions
      .where('exhibition_id')
      .equals(Number(exhibitionId))
      .toArray();

    const artworks = [];
    for (const link of links) {
      const artwork = await db.artworks.get(link.artwork_id);
      if (artwork) artworks.push(artwork);
    }

    return artworks;
  },

  removeArtworkFromExhibition: async (artworkId, exhibitionId) => {
    await db.artwork_exhibitions.delete([Number(artworkId), Number(exhibitionId)]);
  },
};

// Location history operations
export const locationOperations = {
  addHistory: async (artworkId, location, notes) => {
    await db.location_history.add({
      artwork_id: Number(artworkId),
      location,
      notes,
      moved_date: new Date().toISOString(),
    });
  },

  getHistory: async (artworkId) => {
    return await db.location_history
      .where('artwork_id')
      .equals(Number(artworkId))
      .reverse()
      .toArray();
  },
};

// Digital work operations
export const digitalWorkOperations = {
  add: async (work) => {
    const id = await db.digital_works.add({
      ...work,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { id, ...work };
  },

  getAll: async () => {
    return await db.digital_works.toArray();
  },

  getById: async (id) => {
    return await db.digital_works.get(Number(id));
  },

  update: async (id, work) => {
    await db.digital_works.update(Number(id), {
      ...work,
      updated_at: new Date().toISOString(),
    });
    return { id, ...work };
  },

  delete: async (id) => {
    await db.digital_works.delete(Number(id));
  },
};

// Digital file reference operations
export const digitalFileOperations = {
  addFile: async (digitalWorkId, filePath, fileType, isPrimary = false) => {
    const result = await db.digital_file_references.add({
      digital_work_id: digitalWorkId,
      file_path: filePath,
      file_type: fileType,
      is_primary: isPrimary ? 1 : 0,
      created_at: new Date().toISOString(),
    });
    return result;
  },

  getFilesForDigitalWork: async (digitalWorkId) => {
    return await db.digital_file_references
      .where('digital_work_id')
      .equals(Number(digitalWorkId))
      .toArray();
  },

  setPrimaryFile: async (fileId, digitalWorkId) => {
    const files = await db.digital_file_references
      .where('digital_work_id')
      .equals(Number(digitalWorkId))
      .toArray();

    for (const file of files) {
      await db.digital_file_references.update(file.id, { is_primary: 0 });
    }

    await db.digital_file_references.update(Number(fileId), { is_primary: 1 });
  },

  deleteFile: async (id) => {
    await db.digital_file_references.delete(Number(id));
  },
};

// Digital work exhibition operations
export const digitalExhibitionOperations = {
  addDigitalWorkToExhibition: async (digitalWorkId, exhibitionId) => {
    await db.digital_work_exhibitions.put({
      digital_work_id: Number(digitalWorkId),
      exhibition_id: Number(exhibitionId),
    });
  },

  getExhibitionsForDigitalWork: async (digitalWorkId) => {
    const links = await db.digital_work_exhibitions
      .where('digital_work_id')
      .equals(Number(digitalWorkId))
      .toArray();

    const exhibitions = [];
    for (const link of links) {
      const exhibition = await db.exhibitions.get(link.exhibition_id);
      if (exhibition) exhibitions.push(exhibition);
    }

    return exhibitions;
  },

  getDigitalWorksForExhibition: async (exhibitionId) => {
    const links = await db.digital_work_exhibitions
      .where('exhibition_id')
      .equals(Number(exhibitionId))
      .toArray();

    const works = [];
    for (const link of links) {
      const work = await db.digital_works.get(link.digital_work_id);
      if (work) works.push(work);
    }

    return works;
  },

  removeDigitalWorkFromExhibition: async (digitalWorkId, exhibitionId) => {
    await db.digital_work_exhibitions.delete([Number(digitalWorkId), Number(exhibitionId)]);
  },
};

// Database utilities for debugging
export const dbUtils = {
  // Check database version and tables
  checkDatabase: async () => {
    console.log('Database version:', db.verno);
    console.log('Database tables:', db.tables.map(t => t.name));

    // Try to count records in each table
    for (const table of db.tables) {
      try {
        const count = await table.count();
        console.log(`Table ${table.name}: ${count} records`);
      } catch (error) {
        console.error(`Error counting ${table.name}:`, error);
      }
    }
  },

  // Reset database (useful for testing schema changes)
  resetDatabase: async () => {
    console.log('Deleting database...');
    await db.delete();
    console.log('Database deleted. Please refresh the page.');
    window.location.reload();
  },
};
