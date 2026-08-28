
import { GoogleGenAI, Type } from "@google/genai";
import { VoiceName, ScriptLevel } from '../types';

// Robust JSON cleaning for AI responses
const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json\s?|```/g, '').trim();
};

// Generate Script for an Image
export const generateSlideScript = async (base64Image: string, level: ScriptLevel, context?: string): Promise<{script: string, subtitle: string}> => {
  // Always create a new instance before call per instructions
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let audiencePrompt = "일반 대중";
    switch (level) {
      case 'expert': audiencePrompt = "해당 분야의 전문가 (전문 용어 사용, 정확하고 간결한 문체)"; break;
      case 'university': audiencePrompt = "대학생 (학술적이고 정보를 전달하는 어조)"; break;
      case 'elementary': audiencePrompt = "초등학생 (쉽고 친근하며 이해하기 쉬운 단어 사용)"; break;
      case 'senior': audiencePrompt = "어르신 (존댓말 사용, 이해하기 쉽고 천천히 읽히는 문체)"; break;
    }

    const prompt = `이 이미지를 시각적으로 분석하여 ${audiencePrompt}을(를) 대상으로 한 매력적인 한국어 프레젠테이션 나레이션 대본을 작성해 주세요. 
    최대 3문장 이내의 구어체로 작성해야 합니다. 
    반드시 다음 JSON 형식을 엄격히 지켜주세요:
    {
      "script": "슬라이드 내용을 설명하는 전체 나레이션 텍스트",
      "subtitle": "화면 하단에 표시될 짧은 요약 자막 (한 줄)"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            subtitle: { type: Type.STRING }
          },
          required: ["script", "subtitle"]
        }
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error("Empty response");
    
    const cleanText = cleanJsonResponse(rawText);
    const result = JSON.parse(cleanText);
    
    return {
      script: result.script || "대본을 생성할 수 없습니다.",
      subtitle: result.subtitle || "자막 없음"
    };

  } catch (error) {
    console.error("Gemini Script Error:", error);
    throw error;
  }
};

// Generate TTS Audio
export const generateSpeech = async (text: string, voiceName: VoiceName): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const cleanText = text.trim();
    if (!cleanText || cleanText.includes("분석 중") || cleanText.startsWith("오류")) return null;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO' as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};
