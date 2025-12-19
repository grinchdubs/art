// objkt.com API utilities for fetching NFT data

const OBJKT_API_URL = 'https://data.objkt.com/v3/graphql';

/**
 * Fetch all NFTs for a given creator address
 * @param {string} creatorAddress - Tezos wallet address
 * @returns {Promise<Array>} Array of NFT tokens
 */
export async function fetchNFTsByCreator(creatorAddress) {
  const query = `
    query GetCreatorTokens($creatorAddress: String!) {
      token(
        where: {
          creators: {
            creator_address: { _eq: $creatorAddress }
          }
        }
        order_by: { timestamp: asc }
      ) {
        token_id
        fa_contract
        name
        description
        artifact_uri
        display_uri
        thumbnail_uri
        mime
        supply
        timestamp
        metadata
        listings(
          where: { status: { _eq: "active" } }
          order_by: { price: asc }
          limit: 1
        ) {
          price
          amount_left
        }
      }
    }
  `;

  try {
    const response = await fetch(OBJKT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          creatorAddress,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL query failed');
    }

    return data.data?.token || [];
  } catch (error) {
    console.error('Error fetching NFTs from objkt:', error);
    throw error;
  }
}

/**
 * Fetch detailed NFT data including sales history
 * @param {string} tokenId - Token ID
 * @param {string} contractAddress - FA2 contract address
 * @returns {Promise<Object>} NFT details with sales history
 */
export async function fetchNFTDetails(tokenId, contractAddress) {
  const query = `
    query GetTokenDetails($tokenId: String!, $contractAddress: String!) {
      token(
        where: {
          token_id: { _eq: $tokenId }
          fa_contract: { _eq: $contractAddress }
        }
      ) {
        token_id
        fa_contract
        name
        description
        artifact_uri
        display_uri
        thumbnail_uri
        mime
        supply
        timestamp
        metadata
        royalties {
          amount
          decimals
        }
        creators {
          creator_address
        }
        listings_active {
          price
          amount_left
          seller_address
        }
        trades(order_by: { timestamp: desc }) {
          price
          amount
          timestamp
          seller_address
          buyer_address
        }
      }
    }
  `;

  try {
    const response = await fetch(OBJKT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          tokenId,
          contractAddress,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL query failed');
    }

    return data.data?.token?.[0] || null;
  } catch (error) {
    console.error('Error fetching NFT details from objkt:', error);
    throw error;
  }
}

/**
 * Match video title to NFT by name similarity
 * @param {string} videoTitle - Title of the video
 * @param {Array} nfts - Array of NFT objects
 * @returns {Object|null} Matched NFT or null
 */
export function matchVideoToNFT(videoTitle, nfts) {
  if (!videoTitle || !nfts || nfts.length === 0) return null;

  // Normalize titles for comparison
  const normalizeTitle = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  };

  const normalizedVideo = normalizeTitle(videoTitle);

  // Try exact match first
  const exactMatch = nfts.find(nft =>
    normalizeTitle(nft.name || '') === normalizedVideo
  );

  if (exactMatch) return exactMatch;

  // Try partial match (NFT name contains video title or vice versa)
  const partialMatch = nfts.find(nft => {
    const normalizedNFT = normalizeTitle(nft.name || '');
    return normalizedNFT.includes(normalizedVideo) || normalizedVideo.includes(normalizedNFT);
  });

  return partialMatch || null;
}

/**
 * Calculate NFT statistics
 * @param {Object} nft - NFT object from objkt API
 * @returns {Object} Statistics including total sales, volume, etc.
 */
export function calculateNFTStats(nft) {
  if (!nft) {
    return {
      totalSales: 0,
      totalVolume: 0,
      averagePrice: 0,
      lastSalePrice: null,
      lastSaleDate: null,
      currentListingPrice: null,
      editionsTotal: 0,
      editionsSold: 0,
      editionsAvailable: 0,
    };
  }

  const trades = nft.trades || [];
  const totalSales = trades.length;
  const totalVolume = trades.reduce((sum, trade) => sum + (parseFloat(trade.price) || 0), 0);
  const averagePrice = totalSales > 0 ? totalVolume / totalSales : 0;

  const lastTrade = trades[0]; // Already sorted by timestamp desc
  const activeListings = nft.listings_active || [];
  const lowestListing = activeListings.reduce((min, listing) => {
    const price = parseFloat(listing.price);
    return price < min ? price : min;
  }, Infinity);

  const editionsTotal = parseInt(nft.supply) || 0;
  const editionsSold = totalSales;
  const editionsAvailable = activeListings.reduce((sum, listing) => {
    return sum + (parseInt(listing.amount_left) || 0);
  }, 0);

  return {
    totalSales,
    totalVolume: totalVolume / 1000000, // Convert from mutez to tez
    averagePrice: averagePrice / 1000000,
    lastSalePrice: lastTrade ? parseFloat(lastTrade.price) / 1000000 : null,
    lastSaleDate: lastTrade ? lastTrade.timestamp : null,
    currentListingPrice: lowestListing !== Infinity ? lowestListing / 1000000 : null,
    editionsTotal,
    editionsSold,
    editionsAvailable,
  };
}

/**
 * Format tez price for display
 * @param {number} price - Price in tez
 * @returns {string} Formatted price string
 */
export function formatTezPrice(price) {
  if (price === null || price === undefined) return 'N/A';
  return `${price.toFixed(2)} ꜩ`;
}

/**
 * Fetch current Tezos price in USD
 * @returns {Promise<number>} Current XTZ/USD price
 */
export async function fetchTezosPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd');
    const data = await response.json();
    return data.tezos?.usd || 0;
  } catch (error) {
    console.error('Error fetching Tezos price:', error);
    return 0;
  }
}

/**
 * Format price with both Tezos and USD
 * @param {number} tezPrice - Price in Tezos
 * @param {number} usdRate - Current XTZ/USD rate
 * @returns {string} Formatted price string
 */
export function formatPriceWithUSD(tezPrice, usdRate) {
  if (!tezPrice || tezPrice === 0) return 'Not for sale';
  const usdPrice = tezPrice * usdRate;
  return `${tezPrice.toFixed(2)} ꜩ ($${usdPrice.toFixed(2)})`;
}
