import { useState, useEffect } from 'react';
import './ImageLightbox.css';

function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [currentIndex, images.length, onClose]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="lightbox-close" onClick={onClose} title="Close (ESC)">
          ✕
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button 
              className="lightbox-nav lightbox-nav-prev" 
              onClick={goToPrevious}
              title="Previous (←)"
            >
              ‹
            </button>
            <button 
              className="lightbox-nav lightbox-nav-next" 
              onClick={goToNext}
              title="Next (→)"
            >
              ›
            </button>
          </>
        )}

        {/* Image */}
        <div className="lightbox-image-container">
          <img 
            src={currentImage.url} 
            alt={currentImage.alt || `Image ${currentIndex + 1}`}
            className="lightbox-image"
          />
        </div>

        {/* Image info */}
        <div className="lightbox-info">
          {currentImage.name && (
            <div className="lightbox-title">{currentImage.name}</div>
          )}
          {images.length > 1 && (
            <div className="lightbox-counter">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageLightbox;
