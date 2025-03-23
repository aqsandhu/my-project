"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface BannerCarouselProps {
  images: string[];
}

export const BannerCarousel = ({ images }: BannerCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-change banner every 5 seconds
  useEffect(() => {
    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [goToNext]);

  return (
    <div className="relative w-full h-[200px] xs:h-[250px] sm:h-[300px] md:h-[350px] lg:h-[350px] overflow-hidden">
      {/* Banner image */}
      <div className="relative h-full w-full">
        {images.map((image, index) => (
          <div 
            key={index} 
            className={`absolute top-0 left-0 h-full w-full transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: '100vw', maxWidth: '100%' }}
          >
            <Image
              src={`/media/${image}`}
              alt={`Banner ${index + 1}`}
              fill
              priority={index === 0}
              className="object-cover object-center"
              sizes="100vw"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
            
            {/* Left Watermark logo */}
            <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-24 h-24 opacity-15">
              <Image 
                src="/media/logo.png" 
                alt="Logo Watermark" 
                width={96} 
                height={96} 
                className="opacity-20"
              />
            </div>
            
            {/* Right Watermark logo */}
            <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-24 h-24 opacity-15">
              <Image 
                src="/media/logo.png" 
                alt="Logo Watermark" 
                width={96} 
                height={96} 
                className="opacity-20"
              />
            </div>
            
            {/* Banner heading */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
              <h1 
                className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wider uppercase" 
                style={{ 
                  fontFamily: "'Cinzel Decorative', 'Cinzel', serif", 
                  textShadow: "0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5), 0 0 30px rgba(217, 119, 6, 0.3)",
                  letterSpacing: "0.15em"
                }}
              >
                Baxoq Swords and Knives
              </h1>
              <p 
                className="text-sm xs:text-base sm:text-lg text-white mt-2 opacity-90"
                style={{
                  textShadow: "0 0 10px rgba(0,0,0,0.8)"
                }}
              >
                Craftsmanship that stands the test of time
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Left arrow - 30% larger */}
      <button
        onClick={goToPrevious}
        className="absolute left-1 xs:left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 transform rounded-full bg-white/70 p-2 sm:p-3 text-gray-800 shadow-md hover:bg-white"
        aria-label="Previous banner"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Right arrow - 30% larger */}
      <button
        onClick={goToNext}
        className="absolute right-1 xs:right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 transform rounded-full bg-white/70 p-2 sm:p-3 text-gray-800 shadow-md hover:bg-white"
        aria-label="Next banner"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Dots indicators */}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 transform space-x-1 sm:space-x-2 sm:bottom-4">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-3 md:w-3 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
