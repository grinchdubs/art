import { useState } from 'react';

function AdvancedSearch({ filters, onFiltersChange, availableTags = [], availableLocations = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  function handleFilterChange(key, value) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function handleClearFilters() {
    onFiltersChange({
      creation_date_from: '',
      creation_date_to: '',
      price_min: '',
      price_max: '',
      location: '',
      sale_status: '',
      tags: [],
      tag_match: 'any'
    });
  }

  const activeFilterCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null && v !== undefined
  ).length;

  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      border: '1px solid #e0e0e0'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none'
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            🔍 Advanced Search
          </h3>
          {activeFilterCount > 0 && (
            <span style={{
              background: '#3498db',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {activeFilterCount} active
            </span>
          )}
        </div>
        <button
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            transition: 'transform 0.2s'
          }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div style={{ marginTop: '20px' }}>
          {/* Date Range */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                📅 Created From
              </label>
              <input
                type="date"
                value={filters.creation_date_from || ''}
                onChange={(e) => handleFilterChange('creation_date_from', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                📅 Created To
              </label>
              <input
                type="date"
                value={filters.creation_date_to || ''}
                onChange={(e) => handleFilterChange('creation_date_to', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Price Range */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                💰 Min Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.price_min || ''}
                onChange={(e) => handleFilterChange('price_min', e.target.value)}
                placeholder="Minimum price"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                💰 Max Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.price_max || ''}
                onChange={(e) => handleFilterChange('price_max', e.target.value)}
                placeholder="Maximum price"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Location & Sale Status */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                📍 Location
              </label>
              <select
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                💵 Sale Status
              </label>
              <select
                value={filters.sale_status || ''}
                onChange={(e) => handleFilterChange('sale_status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="not_for_sale">Not For Sale</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
              🏷️ Tags
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '8px'
            }}>
              {availableTags.map(tag => {
                const isSelected = filters.tags?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      const currentTags = filters.tags || [];
                      const newTags = isSelected
                        ? currentTags.filter(id => id !== tag.id)
                        : [...currentTags, tag.id];
                      handleFilterChange('tags', newTags);
                    }}
                    style={{
                      padding: '6px 12px',
                      border: `2px solid ${tag.color}`,
                      background: isSelected ? tag.color : 'white',
                      color: isSelected ? 'white' : tag.color,
                      borderRadius: '16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {filters.tags?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '13px', color: '#666' }}>
                  <input
                    type="radio"
                    checked={filters.tag_match === 'any'}
                    onChange={() => handleFilterChange('tag_match', 'any')}
                    style={{ marginRight: '6px' }}
                  />
                  Match ANY tag
                </label>
                <label style={{ fontSize: '13px', color: '#666', marginLeft: '16px' }}>
                  <input
                    type="radio"
                    checked={filters.tag_match === 'all'}
                    onChange={() => handleFilterChange('tag_match', 'all')}
                    style={{ marginRight: '6px' }}
                  />
                  Match ALL tags
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSearch;
