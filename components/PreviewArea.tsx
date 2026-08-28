
import React, { useEffect, useRef, useState } from 'react';
import { Slide, AspectRatio, SubtitleStyle } from '../types';
import { splitTextIntoChunks, getChunkIndexByCharacterCount } from '../services/textUtils';

interface PreviewAreaProps {
  activeSlide: Slide | undefined;
  aspectRatio: AspectRatio;
  subtitleStyle: SubtitleStyle;
}

export const PreviewArea: React.FC<PreviewAreaProps> = ({ activeSlide, aspectRatio, subtitleStyle }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [dynamicSubtitle, setDynamicSubtitle] = useState("");
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Handle Resize and Container Measurement
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    // Initial measurement
    updateSize();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio]); // Re-measure if aspect ratio setting changes

  useEffect(() => {
    // Stop audio if slide changes
    stopAudio();
    // Reset subtitle
    setDynamicSubtitle(activeSlide?.subtitle || activeSlide?.script || "");
  }, [activeSlide?.id]);

  useEffect(() => {
    // Update static subtitle if logic is not playing
    if (!isPlaying && activeSlide) {
        setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || "");
    }
  }, [activeSlide?.subtitle, activeSlide?.script, isPlaying]);

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    if (activeSlide) setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || "");
  };

  const playAudio = () => {
    if (!activeSlide?.audioData) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    stopAudio();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = activeSlide.audioData;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setDynamicSubtitle(activeSlide.subtitle || activeSlide.script || "");
    };
    
    source.start();
    startTimeRef.current = audioContextRef.current.currentTime;
    sourceRef.current = source;
    setIsPlaying(true);

    // Animation Loop for Subtitles
    const script = activeSlide.script || "";
    const duration = activeSlide.audioData.duration;
    
    // Determine max chars based on Aspect Ratio
    // 9:16 (Portrait) -> 20 chars
    // 16:9 (Landscape) -> 45 chars
    const isPortrait = aspectRatio === AspectRatio.Portrait9_16;
    const maxCharsPerLine = isPortrait ? 20 : 45;

    // Use word-boundary respecting chunks
    const chunks = splitTextIntoChunks(script, maxCharsPerLine);
    const totalChunks = chunks.length;

    const updateLoop = () => {
        if (!audioContextRef.current) return;
        
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        const progress = Math.min(Math.max(elapsed / duration, 0), 1);
        
        if (totalChunks > 0) {
            // Use weighted calculation for better sync
            const chunkIndex = getChunkIndexByCharacterCount(chunks, progress);
            setDynamicSubtitle(chunks[chunkIndex]);
        }

        if (elapsed < duration) {
            animationFrameRef.current = requestAnimationFrame(updateLoop);
        }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateLoop);
  };

  if (!activeSlide) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center text-gray-500">
        <p>No slide selected</p>
      </div>
    );
  }

  const isPortrait = aspectRatio === AspectRatio.Portrait9_16;
  
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 1. Calculate the smaller dimension (minDim) of the container.
  //    This matches the logic in videoRenderer: scaleFactor = Math.min(width, height) / 720.
  const minDim = Math.min(containerSize.width, containerSize.height);

  // 2. Calculate scale. 
  //    We use a slight adjustment factor (0.95) to visually match HTML font weight/rendering to Canvas.
  //    Fallback to 1 if minDim is 0 to ensure text is rendered (though container might be hidden)
  const effectiveMinDim = minDim || 720;
  const scale = (effectiveMinDim / 720) * 0.95;

  const scaledFontSize = subtitleStyle.fontSize * scale;
  const scaledPaddingY = scaledFontSize * 0.25;
  const scaledPaddingX = scaledFontSize * 0.5;

  return (
    <div className="flex-1 bg-gray-950 p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Aspect Ratio Container */}
      <div 
        ref={containerRef}
        className={`relative bg-black shadow-2xl rounded-lg overflow-hidden border border-gray-800 transition-all duration-300`}
        style={{
          width: isPortrait ? 'auto' : '100%',
          height: isPortrait ? '95%' : 'auto',
          aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {/* Image Layer */}
        <img 
          src={activeSlide.imageUrl} 
          alt="Preview" 
          className="w-full h-full object-contain"
        />

        {/* Subtitle Layer */}
        {dynamicSubtitle && (
          <div 
            className="absolute left-0 right-0 text-center px-4 pointer-events-none transition-all duration-75"
            style={{ 
               top: `${subtitleStyle.verticalPosition}%`, 
               transform: 'translateY(-50%)' 
            }}
          >
             <span 
              className="inline-block rounded-lg shadow-lg"
              style={{ 
                fontSize: `${scaledFontSize}px`, 
                fontWeight: 'bold',
                lineHeight: 1.2,
                whiteSpace: 'nowrap', // Prevent wrapping to match Canvas behavior
                padding: `${scaledPaddingY}px ${scaledPaddingX}px`,
                fontFamily: subtitleStyle.fontFamily,
                color: subtitleStyle.color,
                backgroundColor: hexToRgba(subtitleStyle.backgroundColor, subtitleStyle.backgroundOpacity),
                textShadow: subtitleStyle.backgroundOpacity < 0.3 ? '0 2px 4px rgba(0,0,0,0.8)' : 'none'
              }}
            >
               {dynamicSubtitle}
             </span>
          </div>
        )}

        {/* Play Overlay */}
        {activeSlide.audioData && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
             <button 
              onClick={isPlaying ? stopAudio : playAudio}
              className={`p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isPlaying ? 'bg-red-500 text-white' : 'bg-brand-600 text-white'}`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
             </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-gray-500 text-sm font-mono">
        Preview Mode • {aspectRatio} • {activeSlide.audioData ? `${activeSlide.audioData.duration.toFixed(1)}s audio` : 'No Audio'}
      </div>
    </div>
  );
};
