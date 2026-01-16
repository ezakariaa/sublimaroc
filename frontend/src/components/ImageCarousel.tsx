import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';

interface ImageCarouselProps {
  images: string[];
  productName: string;
  isVisible: boolean;
  onClose: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  productName, 
  isVisible, 
  onClose 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play des images
  useEffect(() => {
    if (!isVisible || !isAutoPlaying || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2000); // Change d'image toutes les 2 secondes

    return () => clearInterval(interval);
  }, [isVisible, isAutoPlaying, images.length]);

  // Réinitialiser l'index quand le carousel devient visible
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(0);
    }
  }, [isVisible]);

  if (!isVisible || images.length === 0) return null;

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
    setIsAutoPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setIsAutoPlaying(false);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <div 
      className="image-carousel-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isVisible ? 'fadeIn 0.3s ease-in-out' : 'fadeOut 0.3s ease-in-out'
      }}
      onClick={onClose}
    >
      <Card 
        className="image-carousel-card"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: 'white',
          borderRadius: '15px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Card.Header 
          className="d-flex justify-content-between align-items-center"
          style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}
        >
          <h5 className="mb-0">
            <i className="bi bi-images me-2"></i>
            {productName}
          </h5>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary">
              {currentIndex + 1} / {images.length}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              <i className="bi bi-x" style={{ fontSize: '16px' }}></i>
            </button>
          </div>
        </Card.Header>

        {/* Image Container */}
        <Card.Body className="p-0 position-relative">
          <div 
            className="image-container"
            style={{
              position: 'relative',
              width: '100%',
              height: '70vh',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={images[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transition: 'opacity 0.3s ease-in-out'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/mug.webp';
              }}
            />

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  className="carousel-nav-btn carousel-prev"
                  onClick={handlePrevious}
                  style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    color: 'white',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <button
                  className="carousel-nav-btn carousel-next"
                  onClick={handleNext}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    color: 'white',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </>
            )}
          </div>

          {/* Dots Navigation */}
          {images.length > 1 && (
            <div 
              className="carousel-dots"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                zIndex: 10
              }}
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: index === currentIndex ? '#007bff' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Auto-play Toggle */}
          {images.length > 1 && (
            <div 
              className="carousel-controls"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 10
              }}
            >
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isAutoPlaying ? 'rgba(0, 123, 255, 0.8)' : 'rgba(108, 117, 125, 0.8)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                title={isAutoPlaying ? 'Arrêter le défilement automatique' : 'Démarrer le défilement automatique'}
              >
                <i className={`bi ${isAutoPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
              </button>
            </div>
          )}
        </Card.Body>
      </Card>

    </div>
  );
};

export default ImageCarousel;
