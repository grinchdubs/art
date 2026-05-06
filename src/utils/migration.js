import { db } from '../db';
import { artworkAPI, digitalWorkAPI, exhibitionAPI, galleryAPI } from './api';

// Migration status tracker
export const migrationStatus = {
  inProgress: false,
  completed: false,
  error: null,
  progress: {
    artworks: { total: 0, migrated: 0 },
    digitalWorks: { total: 0, migrated: 0 },
    exhibitions: { total: 0, migrated: 0 },
    images: { total: 0, migrated: 0 },
  },
};

// Convert blob/file URLs to actual files for upload
async function urlToFile(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error(`Error converting URL to file: ${url}`, error);
    return null;
  }
}

// Migrate images from file_references
async function migrateImages() {
  const fileRefs = await db.file_references.toArray();
  const digitalFileRefs = await db.digital_file_references.toArray();
  const allImages = [...fileRefs, ...digitalFileRefs];

  migrationStatus.progress.images.total = allImages.length;

  const imageIdMap = new Map(); // Map old file_path to new image ID

  for (const fileRef of allImages) {
    try {
      // Skip if we've already uploaded this file path
      if (imageIdMap.has(fileRef.file_path)) {
        continue;
      }

      // Convert blob URL to file if needed
      let fileToUpload = null;
      const filename = fileRef.file_path.split('/').pop() || `image-${Date.now()}.jpg`;

      if (fileRef.file_path && fileRef.file_path.startsWith('blob:')) {
        fileToUpload = await urlToFile(fileRef.file_path, filename);
      }

      if (fileToUpload) {
        const uploadedImage = await galleryAPI.uploadSingle(fileToUpload);
        imageIdMap.set(fileRef.file_path, uploadedImage.id);
        migrationStatus.progress.images.migrated++;
      } else {
        console.warn(`Could not convert file path to upload: ${fileRef.file_path}`);
      }
    } catch (error) {
      console.error(`Error migrating image ${fileRef.file_path}:`, error);
    }
  }

  return imageIdMap;
}

// Migrate artworks
async function migrateArtworks(imageIdMap) {
  const artworks = await db.artworks.toArray();
  migrationStatus.progress.artworks.total = artworks.length;

  const artworkIdMap = new Map(); // Map old IDs to new IDs

  for (const artwork of artworks) {
    try {
      // Get associated images from file_references
      const fileRefs = await db.file_references
        .where('artwork_id')
        .equals(artwork.id)
        .toArray();

      // Map file paths to new image IDs
      const mappedImages = fileRefs
        .map((fr, index) => {
          const newImageId = imageIdMap.get(fr.file_path);
          if (!newImageId) return null;
          return {
            id: newImageId,
            is_primary: fr.is_primary || false,
            display_order: index,
          };
        })
        .filter(img => img !== null);

      // Remove IndexedDB-specific fields
      const { id, created_at, updated_at, ...artworkData } = artwork;

      // Create artwork with images
      const newArtwork = await artworkAPI.create({
        ...artworkData,
        images: mappedImages,
      });

      artworkIdMap.set(artwork.id, newArtwork.id);
      migrationStatus.progress.artworks.migrated++;
    } catch (error) {
      console.error(`Error migrating artwork ${artwork.id}:`, error);
    }
  }

  return artworkIdMap;
}

// Migrate digital works
async function migrateDigitalWorks(imageIdMap) {
  const digitalWorks = await db.digital_works.toArray();
  migrationStatus.progress.digitalWorks.total = digitalWorks.length;

  const digitalWorkIdMap = new Map(); // Map old IDs to new IDs

  for (const work of digitalWorks) {
    try {
      // Get associated images from digital_file_references
      const fileRefs = await db.digital_file_references
        .where('digital_work_id')
        .equals(work.id)
        .toArray();

      // Map file paths to new image IDs
      const mappedImages = fileRefs
        .map((fr, index) => {
          const newImageId = imageIdMap.get(fr.file_path);
          if (!newImageId) return null;
          return {
            id: newImageId,
            is_primary: fr.is_primary || false,
            display_order: index,
          };
        })
        .filter(img => img !== null);

      // Remove IndexedDB-specific fields
      const { id, created_at, updated_at, ...workData } = work;

      // Create digital work with images
      const newWork = await digitalWorkAPI.create({
        ...workData,
        images: mappedImages,
      });

      digitalWorkIdMap.set(work.id, newWork.id);
      migrationStatus.progress.digitalWorks.migrated++;
    } catch (error) {
      console.error(`Error migrating digital work ${work.id}:`, error);
    }
  }

  return digitalWorkIdMap;
}

// Migrate exhibitions
async function migrateExhibitions(artworkIdMap, digitalWorkIdMap) {
  const exhibitions = await db.exhibitions.toArray();
  migrationStatus.progress.exhibitions.total = exhibitions.length;

  for (const exhibition of exhibitions) {
    try {
      // Get associated artworks
      const artworkExhibitions = await db.artwork_exhibitions
        .where('exhibition_id')
        .equals(exhibition.id)
        .toArray();

      const mappedArtworkIds = artworkExhibitions
        .map(ae => artworkIdMap.get(ae.artwork_id))
        .filter(id => id !== undefined);

      // Get associated digital works
      const digitalWorkExhibitions = await db.digital_work_exhibitions
        .where('exhibition_id')
        .equals(exhibition.id)
        .toArray();

      const mappedDigitalWorkIds = digitalWorkExhibitions
        .map(dwe => digitalWorkIdMap.get(dwe.digital_work_id))
        .filter(id => id !== undefined);

      // Remove IndexedDB-specific fields
      const { id, created_at, updated_at, ...exhibitionData } = exhibition;

      // Create exhibition with relationships
      await exhibitionAPI.create({
        ...exhibitionData,
        artworks: mappedArtworkIds,
        digital_works: mappedDigitalWorkIds,
      });

      migrationStatus.progress.exhibitions.migrated++;
    } catch (error) {
      console.error(`Error migrating exhibition ${exhibition.id}:`, error);
    }
  }
}

// Main migration function
export async function migrateData(onProgress) {
  if (migrationStatus.inProgress) {
    throw new Error('Migration already in progress');
  }

  migrationStatus.inProgress = true;
  migrationStatus.completed = false;
  migrationStatus.error = null;

  try {
    // Step 1: Migrate images
    if (onProgress) onProgress('Migrating images...');
    const imageIdMap = await migrateImages();

    // Step 2: Migrate artworks
    if (onProgress) onProgress('Migrating physical artworks...');
    const artworkIdMap = await migrateArtworks(imageIdMap);

    // Step 3: Migrate digital works
    if (onProgress) onProgress('Migrating digital works...');
    const digitalWorkIdMap = await migrateDigitalWorks(imageIdMap);

    // Step 4: Migrate exhibitions
    if (onProgress) onProgress('Migrating exhibitions...');
    await migrateExhibitions(artworkIdMap, digitalWorkIdMap);

    migrationStatus.completed = true;
    migrationStatus.inProgress = false;

    if (onProgress) onProgress('Migration completed successfully!');

    return {
      success: true,
      summary: {
        artworks: `${migrationStatus.progress.artworks.migrated}/${migrationStatus.progress.artworks.total}`,
        digitalWorks: `${migrationStatus.progress.digitalWorks.migrated}/${migrationStatus.progress.digitalWorks.total}`,
        exhibitions: `${migrationStatus.progress.exhibitions.migrated}/${migrationStatus.progress.exhibitions.total}`,
        images: `${migrationStatus.progress.images.migrated}/${migrationStatus.progress.images.total}`,
      },
    };
  } catch (error) {
    migrationStatus.error = error.message;
    migrationStatus.inProgress = false;

    if (onProgress) onProgress(`Migration failed: ${error.message}`);

    return {
      success: false,
      error: error.message,
    };
  }
}

// Export current IndexedDB data as JSON (for backup)
export async function exportIndexedDBData() {
  const data = {
    artworks: await db.artworks.toArray(),
    digital_works: await db.digital_works.toArray(),
    exhibitions: await db.exhibitions.toArray(),
    file_references: await db.file_references.toArray(),
    digital_file_references: await db.digital_file_references.toArray(),
    artwork_exhibitions: await db.artwork_exhibitions.toArray(),
    digital_work_exhibitions: await db.digital_work_exhibitions.toArray(),
    location_history: await db.location_history.toArray(),
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `art-catalog-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
