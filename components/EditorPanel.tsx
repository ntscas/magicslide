import React, { useState } from 'react';
import { Slide, VoiceName, ScriptLevel, SubtitleStyle } from '../types';
import { VOICES } from '../constants';

interface EditorPanelProps {
  slide: Slide | undefined;
  onUpdate: (id: string, updates: Partial<Slide>) => void;
  onGenerateAudio: (id: string, text: string, voice: VoiceName) => void;
  onGenerateScript: (id: string, level: ScriptLevel) => void;
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitleStyle: (style: SubtitleStyle) => void;
  // Lifted State Props
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  scriptLevel: ScriptLevel;
  onScriptLevelChange: (level: ScriptLevel) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
  slide, 
  onUpdate, 
  onGenerateAudio, 
  onGenerateScript,
  subtitleStyle,
  onUpdateSubtitleStyle,
  selectedVoice,
  onVoiceChange,
  scriptLevel,
  onScriptLevelChange
}) => {
  const [isScriptGenerating, setIsScriptGenerating] = useState(false);

  const handleScriptGen = async () => {
    if (!slide) return;
    setIsScriptGenerating(true);
    await onGenerateScript(slide.id, scriptLevel);
    setIsScriptGenerating(false);
  };

  const updateStyle = (field: keyof SubtitleStyle, value: any) => {
    onUpdateSubtitleStyle({ ...subtitleStyle, [field]: value });
  };

  if (!slide) return <div className="h-72 bg-gray-900 border-t border-gray-800 p-8 flex items-center justify-center text-gray-600">Select a slide to edit</div>;

  return (
    <div className="h-80 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row">
      
      {/* Script Section */}
      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Narration Script (TTS)</label>
          
          <div className="flex items-center gap-2">
            <select 
              className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 focus:ring-brand-500 text-gray-300 outline-none"
              value={scriptLevel}
              onChange={(e) => onScriptLevelChange(e.target.value as ScriptLevel)}
            >
              <option value="expert">전문가 (Expert)</option>
              <option value="university">대학생 (University)</option>
              <option value="elementary">초등학생 (Elementary)</option>
              <option value="senior">시니어 (Senior)</option>
            </select>
            <button 
              onClick={handleScriptGen}
              disabled={isScriptGenerating}
              className={`text-xs px-3 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1 transition-colors ${isScriptGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isScriptGenerating ? (
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              )}
              자막생성
            </button>
          </div>
        </div>
        <textarea
          className="flex-1 bg-gray-800 border-gray-700 rounded-md p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none leading-relaxed"
          placeholder="Enter text for the AI to speak..."
          value={slide.script}
          onChange={(e) => onUpdate(slide.id, { script: e.target.value })}
        />
        <div className="flex items-center gap-3">
           <select 
             className="bg-gray-800 border-gray-700 text-sm rounded px-3 py-1.5 focus:ring-brand-500 outline-none"
             value={selectedVoice}
             onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
           >
             {VOICES.map(v => <option key={v.name} value={v.name}>{v.name} ({v.gender}, {v.style})</option>)}
           </select>
           
           <button 
             onClick={() => onGenerateAudio(slide.id, slide.script, selectedVoice)}
             disabled={slide.isGeneratingAudio || !slide.script}
             className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all
               ${slide.isGeneratingAudio 
                 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                 : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20'}`}
           >
             {slide.isGeneratingAudio ? (
               <>
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Generating...
               </>
             ) : (
               <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Generate Voice
               </>
             )}
           </button>
        </div>
      </div>

      {/* Subtitle Style Settings (Replaces Textarea) */}
      <div className="w-full md:w-1/3 p-6 flex flex-col gap-4 bg-gray-900/50 overflow-y-auto custom-scrollbar">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subtitle Styles</label>
        
        <div className="space-y-4">
          {/* Vertical Position */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
               <span>Vertical Position</span>
               <span>{subtitleStyle.verticalPosition}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={subtitleStyle.verticalPosition} 
              onChange={(e) => updateStyle('verticalPosition', Number(e.target.value))}
              className="w-full accent-brand-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
               <span>Font Size</span>
               <span>{subtitleStyle.fontSize}px (Base)</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={subtitleStyle.fontSize} 
              onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
              className="w-full accent-brand-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-1">
             <label className="text-xs text-gray-500">Font Family</label>
             <select 
               value={subtitleStyle.fontFamily}
               onChange={(e) => updateStyle('fontFamily', e.target.value)}
               className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:ring-brand-500 outline-none"
             >
               <option value="Inter">Inter (Default)</option>
               <option value="sans-serif">Sans Serif</option>
               <option value="serif">Serif</option>
               <option value="monospace">Monospace</option>
               <option value="cursive">Handwritten</option>
             </select>
          </div>

          {/* Text & Background Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Text Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={subtitleStyle.color}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-gray-400 uppercase">{subtitleStyle.color}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Bg Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={subtitleStyle.backgroundColor}
                  onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-gray-400 uppercase">{subtitleStyle.backgroundColor}</span>
              </div>
            </div>
          </div>

           {/* Bg Opacity */}
           <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
               <span>Background Opacity</span>
               <span>{Math.round(subtitleStyle.backgroundOpacity * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              value={subtitleStyle.backgroundOpacity} 
              onChange={(e) => updateStyle('backgroundOpacity', Number(e.target.value))}
              className="w-full accent-brand-500 bg-gray-700 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

        </div>
      </div>
    </div>
  );
};