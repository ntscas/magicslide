
import { Slide, SubtitleStyle } from '../types';
import { splitTextIntoChunks, getChunkIndexByCharacterCount } from './textUtils';

export const exportVideo = async (
  slides: Slide[], 
  width: number, 
  height: number,
  subtitleStyle: SubtitleStyle,
  onProgress: (progress: number, msg: string) => void,
  includeSubtitles: boolean
): Promise<Blob> => {
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not create canvas context");

  const stream = canvas.captureStream(30); // 30 FPS
  const audioContext = new AudioContext();
  const dest = audioContext.createMediaStreamDestination();
  
  // Combine canvas video + audio destination
  const combinedTracks = [
    ...stream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ];
  const combinedStream = new MediaStream(combinedTracks);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9' 
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      audioContext.close();
      resolve(blob);
    };

    recorder.start();

    // Determine max characters based on orientation (Portrait vs Landscape)
    const isPortrait = width < height;
    const maxCharsPerLine = isPortrait ? 20 : 45;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      onProgress((i / slides.length) * 100, `Rendering slide ${i + 1}/${slides.length}...`);

      // 1. Prepare Image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slide.imageUrl;
      await new Promise((r) => { img.onload = r; });

      // 2. Prepare Audio
      let duration = 3000; // Default 3s if no audio
      let source: AudioBufferSourceNode | null = null;

      if (slide.audioData) {
        duration = slide.audioData.duration * 1000;
        source = audioContext.createBufferSource();
        source.buffer = slide.audioData;
        source.connect(dest);
        source.start(audioContext.currentTime);
      }

      // Pre-calculate subtitle chunks from Script (not slide.subtitle) if audio exists
      // Use word-boundary respecting split with dynamic max chars
      const scriptText = slide.script || "";
      const textChunks = splitTextIntoChunks(scriptText, maxCharsPerLine);
      const totalChunks = textChunks.length;

      // 3. Animation Loop for this slide
      const startTime = performance.now();
      
      await new Promise<void>((resolveFrame) => {
        const drawFrame = () => {
          const now = performance.now();
          const elapsed = now - startTime;
          const progress = Math.min(Math.max(elapsed / duration, 0), 1);

          // Draw Background (Black)
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);

          // Draw Image (Contain)
          const scale = Math.min(width / img.width, height / img.height);
          const x = (width / 2) - (img.width / 2) * scale;
          const y = (height / 2) - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          // Determine current subtitle text
          let currentSubtitle = slide.subtitle; // Default fallback
          if (slide.audioData && scriptText && totalChunks > 0) {
             // Use weighted calculation for better sync
             const chunkIndex = getChunkIndexByCharacterCount(textChunks, progress);
             currentSubtitle = textChunks[chunkIndex];
          }

          // Draw Subtitle with Style (Only if includeSubtitles is true)
          if (includeSubtitles && currentSubtitle) {
             // Scale font based on min dimension to handle both landscape and portrait reasonably
             const scaleFactor = Math.min(width, height) / 720;
             const fontSize = subtitleStyle.fontSize * scaleFactor;
             
             ctx.font = `bold ${fontSize}px ${subtitleStyle.fontFamily}, sans-serif`;
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             
             const textX = width / 2;
             // Calculate Y based on percentage
             const textY = height * (subtitleStyle.verticalPosition / 100);
             
             // Measure text for background box
             const metrics = ctx.measureText(currentSubtitle);
             const textWidth = metrics.width;
             const textHeight = fontSize * 1.2; // approx
             const padding = fontSize * 0.5;

             // Draw Background Box
             if (subtitleStyle.backgroundOpacity > 0) {
                 ctx.fillStyle = hexToRgba(subtitleStyle.backgroundColor, subtitleStyle.backgroundOpacity);
                 // Rounded rect manually or just rect
                 ctx.fillRect(
                     textX - textWidth / 2 - padding,
                     textY - textHeight / 2 - padding / 2,
                     textWidth + padding * 2,
                     textHeight + padding
                 );
             }

             // Draw Text
             ctx.fillStyle = subtitleStyle.color;
             // Optional shadow for better visibility if no bg
             if (subtitleStyle.backgroundOpacity < 0.3) {
                 ctx.shadowColor = 'rgba(0,0,0,0.8)';
                 ctx.shadowBlur = 4;
                 ctx.lineWidth = fontSize * 0.05;
                 ctx.strokeStyle = 'black';
                 ctx.strokeText(currentSubtitle, textX, textY);
             } else {
                 ctx.shadowColor = 'transparent';
             }
             
             ctx.fillText(currentSubtitle, textX, textY);
          }

          if (elapsed < duration) {
            requestAnimationFrame(drawFrame);
          } else {
            resolveFrame();
          }
        };
        drawFrame();
      });

      if (source) {
        source.stop();
        source.disconnect();
      }
    }

    onProgress(100, "Finalizing...");
    recorder.stop();
  });
};
