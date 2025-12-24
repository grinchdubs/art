import { useState, useEffect } from 'react';
import { tagAPI } from '../utils/api';
import './TagSelector.css';

export default function TagSelector({ selectedTags = [], onChange }) {
  const [allTags, setAllTags] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await tagAPI.getAll();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const toggleTag = (tagId) => {
    const isSelected = selectedTags.includes(tagId);
    if (isSelected) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await tagAPI.create({ name: newTagName.trim(), color: newTagColor });
      // Reload all tags to get updated counts
      await loadTags();
      onChange([...selectedTags, newTag.id]);
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setShowNewTagForm(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
      // Reload tags in case the tag was actually created or already exists
      await loadTags();
      alert('Failed to create tag. It may already exist.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  const getTagById = (id) => allTags.find(t => t.id === id);

  return (
    <div className="tag-selector">
      <label className="tag-selector-label">Tags</label>
      
      {/* Selected tags */}
      <div className="selected-tags">
        {selectedTags.length > 0 ? (
          selectedTags.map(tagId => {
            const tag = getTagById(tagId);
            return tag ? (
              <span
                key={tag.id}
                className="tag-badge"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ) : null;
          })
        ) : (
          <span className="no-tags">No tags selected</span>
        )}
      </div>

      {/* Add tag button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="add-tag-button"
      >
        {showDropdown ? 'Close' : 'Add Tag'}
      </button>

      {/* Tag dropdown */}
      {showDropdown && (
        <div className="tag-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="available-tags">
            {allTags.map(tag => (
              <label key={tag.id} className="tag-option">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                <span
                  className="tag-badge"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
                <span className="tag-count">({tag.artwork_count + tag.digital_work_count})</span>
              </label>
            ))}
          </div>

          {/* Create new tag form */}
          {!showNewTagForm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewTagForm(true);
              }}
              className="create-tag-button"
            >
              + Create New Tag
            </button>
          ) : (
            <div className="new-tag-form">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tag name"
                className="new-tag-input"
                autoFocus
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="new-tag-color"
              />
              <div className="new-tag-actions">
                <button 
                  type="button" 
                  onClick={handleCreateTag}
                  className="new-tag-save"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTagForm(false);
                    setNewTagName('');
                    setNewTagColor('#3b82f6');
                  }}
                  className="new-tag-cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
