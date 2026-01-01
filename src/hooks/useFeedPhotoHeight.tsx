import { useState, useEffect } from 'react';

/**
 * Hook to calculate maximum photo height for feed cards
 * Ensures user header, photo, title, and first comment are visible on mobile
 */
export function useFeedPhotoHeight() {
  const [maxHeight, setMaxHeight] = useState<number>(400);

  useEffect(() => {
    const calculateMaxHeight = () => {
      // Typical mobile viewport height
      // iPhone SE: 667px, iPhone 12/13: 844px, iPhone 14 Pro Max: 932px
      const viewportHeight = window.innerHeight;
      
      // Estimated heights for content elements (in pixels):
      // - User header: ~60px (px-4 py-3 with border)
      // - Title section: ~50px (title + description/badges if present)
      // - First comment: ~70px (avatar + text + spacing + border)
      // - Padding/margins: ~30px
      // - Bottom nav (mobile): ~60px
      // Total non-photo content: ~270px
      const contentHeight = 270;
      
      // Calculate available height for photo
      // Reserve space for all content to ensure visibility
      const availableHeight = Math.max(300, viewportHeight - contentHeight);
      
      // Set a uniform max height for all photos (for uniform text height)
      // Cap at 450px to ensure reasonable sizing on larger devices
      // Minimum 300px to ensure photos are visible
      const uniformHeight = Math.min(Math.max(300, availableHeight), 450);
      
      setMaxHeight(uniformHeight);
    };

    // Calculate on mount and window resize
    calculateMaxHeight();
    window.addEventListener('resize', calculateMaxHeight);
    
    return () => {
      window.removeEventListener('resize', calculateMaxHeight);
    };
  }, []);

  return maxHeight;
}

