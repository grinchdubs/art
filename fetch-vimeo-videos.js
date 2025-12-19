// Vimeo API video fetcher
// Replace YOUR_ACCESS_TOKEN with your actual Vimeo access token

const ACCESS_TOKEN = '87555ea48513b57cdbb401a43ab84c44'; // Replace this!
const USERNAME = 'grnch';

async function fetchAllVideos() {
  const videos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.vimeo.com/users/${USERNAME}/videos?page=${page}&per_page=100`;

    console.log(`Fetching page ${page}...`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract video URLs and titles
    data.data.forEach(video => {
      videos.push({
        url: video.link,
        title: video.name,
        description: video.description || '',
        duration: video.duration,
        created_time: video.created_time
      });
    });

    console.log(`Found ${data.data.length} videos on page ${page}`);

    // Check if there are more pages
    hasMore = data.paging.next !== null;
    page++;
  }

  return videos;
}

// Run the script
fetchAllVideos()
  .then(videos => {
    console.log(`\n✅ Found ${videos.length} total videos!\n`);

    // Sort by creation date (oldest first)
    videos.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

    // Create CSV format with URL and Title
    const csvLines = ['URL,Title'];
    videos.forEach(video => {
      // Escape title for CSV (handle commas and quotes)
      const escapedTitle = video.title.replace(/"/g, '""');
      csvLines.push(`${video.url},"${escapedTitle}"`);
    });

    console.log('=== VIDEO DATA (CSV Format) ===\n');
    console.log(csvLines.join('\n'));
    console.log('\n=== COPY THE DATA ABOVE ===\n');

    // Also save to files
    const fs = require('fs');

    // Save CSV format
    fs.writeFileSync('vimeo-videos.csv', csvLines.join('\n'));
    console.log('📁 Data saved to vimeo-videos.csv');

    // Save just URLs for backward compatibility
    fs.writeFileSync('vimeo-videos.txt', videos.map(v => v.url).join('\n'));
    console.log('📁 URLs also saved to vimeo-videos.txt');

    // Save detailed JSON
    fs.writeFileSync('vimeo-videos.json', JSON.stringify(videos, null, 2));
    console.log('📁 Full data saved to vimeo-videos.json');
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure you:');
    console.error('1. Replaced YOUR_ACCESS_TOKEN with your actual token');
    console.error('2. Have "Public" and "Private" scopes enabled in your Vimeo app');
  });
