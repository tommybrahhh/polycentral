// src/hooks/useAnimatedCounter.js

import { useState, useEffect, useRef } from 'react';

// Custom hook for smooth number animation
const useAnimatedCounter = (targetValue, duration = 1000) => {
  const [count, setCount] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    const start = count;
    const end = targetValue;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [targetValue, duration]);

  return count;
};

export default useAnimatedCounter;