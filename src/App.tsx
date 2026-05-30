import React, { useState, useEffect, useRef } from 'react';
import { SYSTEM_API_KEYS, getSavedRotatorIndex, saveRotatorIndex } from './apiKeys';
import { extractAudioFromMp4, isMp4File } from './utils/mp4Demuxer';
import { AudioVisualizer } from './components/AudioVisualizer';
const logoImg = "/logo01.jpg";
import { 
  Key, 
  Upload, 
  FileAudio, 
  FileVideo, 
  Play, 
  Pause, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw, 
  RotateCcw, 
  Activity, 
  Radio, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  Share2,
  X,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

// Type definitions
interface Headline {
  cat: 'hard' | 'quote' | 'warning' | 'political' | 'curiosity' | 'general';
  text: string;
  ts: string | null;
}

const CATEGORIES = {
  hard: { 
    label: "তথ্যভিত্তিক (Hard News)", 
    color: "#e85d3a", 
    borderClass: "border-l-[#e85d3a]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(232,93,58,0.1)] hover:border-[#e85d3a]/30" 
  },
  quote: { 
    label: "উদ্ধৃতিমূলক (Direct Quote)", 
    color: "#3b82f6", 
    borderClass: "border-l-[#3b82f6]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:border-[#3b82f6]/30" 
  },
  warning: { 
    label: "হুঁশিয়ারিমূলক (Warning)", 
    color: "#ef4444", 
    borderClass: "border-l-[#ef4444]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(239,68,68,0.1)] hover:border-[#ef4444]/30" 
  },
  political: { 
    label: "রাজনৈতিক (Political)", 
    color: "#f5a623", 
    borderClass: "border-l-[#f5a623]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(245,166,35,0.1)] hover:border-[#f5a623]/30" 
  },
  curiosity: { 
    label: "কৌতূহলোদ্দীপক (Curiosity)", 
    color: "#a855f7", 
    borderClass: "border-l-[#a855f7]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(168,85,247,0.1)] hover:border-[#a855f7]/30" 
  },
  general: { 
    label: "সাধারণ ভিডিও (General)", 
    color: "#e85d3a", 
    borderClass: "border-l-[#e85d3a]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(232,93,58,0.08)] hover:border-[#e85d3a]/20" 
  }
};

const NEWS_MODE_PROMPT = `তুমি একজন অভিজ্ঞ বাংলাদেশি 'চিফ নিউজ এডিটর'।

তোমার কাজ:
এই অডিও/ভিডিও ফাইলটি মনোযোগ দিয়ে শোনো। বক্তা যা বলেছেন, শুধুমাত্র সেই বাস্তব কথার উপর ভিত্তি করে শিরোনাম তৈরি করো।

কঠিন নিষেধ:
- বক্তা যা বলেননি তা শিরোনামে লেখা যাবে না।
- কোনো কাল্পনিক তথ্য, ঘটনা বা উদ্ধৃতি যোগ করা করা যাবে না।
- অডিও স্পষ্ট না হলে "অডিও স্পষ্ট নয়" বলো, কিছু বানিয়ে দিও না।

শিরোনাম তৈরির নিয়ম:
১. বক্তব্যের সবচেয়ে গুরুত্বপূর্ণ তথ্যটি খুঁজে বের করো।
২. জনজীবনে প্রভাব ফেলে এমন তথ্যকে প্রাধান্য দাও।
৩. বক্তার শক্তিশালী শব্দ যেমন 'জিরো টলারেন্স', 'কঠোর ব্যবস্থা', 'ছাড় দেওয়া হবে না' — এগুলো সরাসরি উদ্ধৃতি হিসেবে ব্যবহার করো।
৪. শিরোনাম সংক্ষিপ্ত ও ঝাঁজালো রাখো।

উদ্ধৃতি শিরোনামের জন্য অডিওতে ওই কথাটি কত সেকেন্ডে বলা হয়েছে তা আনুমানিকভাবে উল্লেখ করো।

৫টি ক্যাটাগরিতে মোট ৩০টির বেশি শিরোনাম দাও (প্রতি ক্যাটাগরিতে কমপক্ষে ৬টি):

ক্যাটাগরি ১ — "hard" (তথ্যভিত্তিক Hard News):
বস্তুনিষ্ঠ, তথ্যবহুল। কে কী করলেন বা ঘোষণা দিলেন।
ক্যাটাগরি ২ — "quote" (উদ্ধৃতিমূলক Direct Quote):
হুবহু বক্তার কথা, একক উদ্ধৃতি চিহ্নে ('...') মুড়িয়ে।
ক্যাটাগরি ৩ — "warning" (হুঁশিয়ারিমূলক Warning/Action):
কঠোর সতর্কবার্তা বা শাস্তির ঘোষণা।
ক্যাটাগরি ৪ — "political" (রাজনৈতিক/আক্রমণাত্মক Political/Conflict):
রাজনৈতিক প্রতিপক্ষ বা সংঘাতের বিষয়।
ক্যাটাগরি ৫ — "curiosity" (কৌতূহলোদ্দীপক Curiosity/Question):
দর্শকের মনে প্রশ্ন জাগায়, টকশো বা থাম্বনেইলের জন্য।

শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দাও, অন্য কোনো টেক্সট, মার্কডাউন বা backtick দেবে না:

{
  "headlines": [
    {"cat": "hard",      "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "quote",     "text": "'উদ্ধৃতি এখানে'",     "ts": "0:34"},
    {"cat": "warning",   "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "political", "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "curiosity", "text": "শিরোনাম এখানে?",     "ts": null}
  ]
}

ts ফিল্ডে: উদ্ধৃতির জন্য আনুমানিক সময় দাও (যেমন "0:34"), অন্যগুলোর জন্য null রাখো।`;

const GENERAL_MODE_PROMPT = `এই ভিডিও/অডিওটি দেখো/শোনো এবং বিষয়বস্তু বিশ্লেষণ করে ১০-১৫টি আকর্ষণীয় বাংলা শিরোনাম বা ক্যাপশন তৈরি করো। শুধুমাত্র ভিডিওতে যা আছে তার উপর ভিত্তি করে শিরোনাম দাও।

শুধুমাত্র JSON ফরম্যাটে দাও, অন্য কোনো টেক্সট বা backtick দেবে না:
{
  "headlines": [
    {"cat": "general", "text": "শিরোনাম এখানে", "ts": null}
  ]
}`;

const TEXT_NEWS_MODE_PROMPT = `তুমি একজন অভিজ্ঞ বাংলাদেশি 'চিফ নিউজ এডিটর'।

তোমার কাজ:
নিচে দেওয়া খবর বা টেক্সটটি মনোযোগ দিয়ে পড়ো এবং শুধুমাত্র এই খবরের বাস্তব তথ্যের উপর ভিত্তি করে শিরোনাম তৈরি করো।

কঠিন নিষেধ:
- টেক্সটে যা নেই তা শিরোনামে লেখা যাবে না।
- কোনো কাল্পনিক তথ্য, ঘটনা বা উদ্ধৃতি যোগ করা করা যাবে না।
- নিজের থেকে কোনো তথ্য বানিয়ে দিও না।

শিরোনাম তৈরির নিয়ম:
১. খবরের সবচেয়ে গুরুত্বপূর্ণ তথ্যটি খুঁজে বের করো।
২. জনজীবনে প্রভাব ফেলে এমন তথ্যকে প্রাধান্য দাও।
৩. টেক্সটের শক্তিশালী শব্দ যেমন 'জিরো টলারেন্স', 'কঠোর ব্যবস্থা', 'ছাড় দেওয়া হবে না' — এগুলো সরাসরি উদ্ধৃতি হিসেবে ব্যবহার করো।
৪. শিরোনাম সংক্ষিপ্ত ও ঝাঁজালো রাখো।

৫টি ক্যাটাগরিতে মোট ৩০টির বেশি শিরোনাম দাও (প্রতি ক্যাটাগরিতে কমপক্ষে ৬টি):

ক্যাটাগরি ১ — "hard" (তথ্যভিত্তিক Hard News):
বস্তুনিষ্ঠ, তথ্যবহুল। কে কী করলেন বা ঘোষণা দিলেন।
ক্যাটাগরি ২ — "quote" (উদ্ধৃতিমূলক Direct Quote):
হুবহু বক্তার কথা বা বক্তব্য থেকে গুরুত্বপূর্ণ উক্তি, একক উদ্ধৃতি চিহ্নে ('...') মুড়িয়ে।
ক্যাটাগরি ৩ — "warning" (হুঁশিয়ারিমূলক Warning/Action):
কঠোর সতর্কবার্তা বা শাস্তির ঘোষণা।
ক্যাটাগরি ৪ — "political" (রাজনৈতিক/আক্রমণাত্মক Political/Conflict):
রাজনৈতিক প্রতিপক্ষ বা সংঘাতের বিষয়।
क্যাটাগরি ৫ — "curiosity" (কৌতূহলোদ্দীপক Curiosity/Question):
দর্শকের মনে প্রশ্ন জাগায়, টকশো বা থাম্বনেইলের জন্য।

শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দাও, অন্য কোনো টেক্সট, মার্কডাউন বা backtick দেবে না:

{
  "headlines": [
    {"cat": "hard",      "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "quote",     "text": "'উদ্ধৃতি এখানে'",     "ts": null},
    {"cat": "warning",   "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "political", "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "curiosity", "text": "শিরোনাম এখানে?",     "ts": null}
  ]
}

ts ফিল্ডে: টেক্সট ইনপুটের ক্ষেত্রে কোনো টাইমস্ট্যাম্প (ts) ফিল্ডের প্রয়োজন নেই, তাই ts সবসময় null রাখবে।`;

const TEXT_GENERAL_MODE_PROMPT = `এই খবর বা টেক্সটটি বিশ্লেষণ করে ১০-১৫টি আকর্ষণীয় বাংলা শিরোনাম বা সোশ্যাল মিডিয়া ক্যাপশন তৈরি করো। শুধুমাত্র লেখার বিষয়বস্তুর উপর ভিত্তি করে শিরোনাম দাও।

শুধুমাত্র JSON ফরম্যাটে দাও, অন্য কোনো টেক্সট বা backtick দেবে না:
{
  "headlines": [
    {"cat": "general", "text": "শিরোনাম এখানে", "ts": null}
  ]
}`;

export default function App() {
  // Key state
  const [keySource, setKeySource] = useState<'rotator' | 'custom'>('rotator');
  const [currentRotatorIndex, setCurrentRotatorIndex] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [infoModalTab, setInfoModalTab] = useState<'privacy' | 'support' | null>(null);

  // File loading state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Option states
  const [videoType, setVideoType] = useState<'news' | 'general'>('news');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [inputMode, setInputMode] = useState<'media' | 'text'>('media');
  const [inputText, setInputText] = useState<string>('');
  const [speakerName, setSpeakerName] = useState<string>('');

  // AI & results execution states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [accumulatedHeadlines, setAccumulatedHeadlines] = useState<Headline[]>([]);
  const [displayedHeadlines, setDisplayedHeadlines] = useState<Headline[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Toast feedback
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load API Key on mount
  useEffect(() => {
    const savedSource = localStorage.getItem('gemini_key_source') || 'rotator';
    setKeySource(savedSource as 'rotator' | 'custom');

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }

    const savedIdx = getSavedRotatorIndex();
    setCurrentRotatorIndex(savedIdx);

    if (savedSource === 'custom' && !savedKey) {
      setShowKeyInput(true);
    } else {
      setShowKeyInput(false);
    }
  }, []);

  // Update audio source when file changes
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      if (audioRef.current) {
        audioRef.current.src = url;
        setIsPlaying(false);
        setCurrentTime(0);
      }
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [uploadedFile]);

  // Helper: Toast Trigger
  const showToast = (msg: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Helper: Play unique dual-note chime notification sound
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      
      // Note 1: E5 (659.25 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);

      // Note 2: A5 (880.00 Hz) - offset for melodic chime
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.07);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.07);
      gain2.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.07);
      osc2.stop(audioCtx.currentTime + 0.45);
    } catch (err) {
      console.warn('Notification audio failed:', err);
    }
  };

  // Helper: Save API Key
  const handleSaveApiKey = () => {
    const key = tempApiKey.trim();
    if (!key) {
      showToast('Gemini API Key দিন');
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowKeyInput(false);
    showToast('API Key সেভ হয়েছে ✓');
  };

  // Helper: Erase Key
  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setTempApiKey('');
    setShowKeyInput(true);
    showToast('API Key মুছে ফেলা হয়েছে');
  };

  // Helper: File constraint auditor to protect mobile memory and API payload specs
  const processSelectedFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      showToast('শুধুমাত্র অডিও বা ভিডিও ফাইল আপলোড করুন');
      return;
    }

    const SAFE_MAX_SIZE = 35 * 1024 * 1024; // 35 MB safe limit for client-side processing
    
    if (file.size > SAFE_MAX_SIZE) {
      if (isMp4File(file)) {
        setIsExtractingAudio(true);
        setExtractionProgress(0);
        showToast('⏱ বিশাল ভিডিও ফাইল সনাক্ত হয়েছে! র্যাম নিরাপদ রাখতে অফলাইনে অডিও আলাদা করা হচ্ছে...');
        try {
          const audioBlob = await extractAudioFromMp4(file, (progress) => {
            setExtractionProgress(progress);
          });
          
          const audioFileName = file.name.replace(/\.[^/.]+$/, "") + "_soundtrack.aac";
          const extractedFile = new File([audioBlob], audioFileName, { type: 'audio/aac' });
          
          setUploadedFile(extractedFile);
          setAccumulatedHeadlines([]);
          setDisplayedHeadlines([]);
          showToast('সাউন্ডট্র্যাক আলাদা করা সম্পন্ন হয়েছে! ৩৫ এমবির নিচে হালকা অডিও লোড করা হয়েছে ✓');
        } catch (error: any) {
          console.error("Extraction error:", error);
          showToast(error?.message || 'অডিও নিষ্কাশন ব্যর্থ হয়েছে। স্ট্যান্ডার্ড MP4 ফাইল ব্যবহার করুন।');
        } finally {
          setIsExtractingAudio(false);
          setExtractionProgress(0);
        }
        return;
      } else {
        const errorMsg = 'মোবাইল ব্রাউজার নিরাপদ রাখতে সর্বোচ্চ ৩৫ MB সাইজের ফাইল দিন। ১-২ জিবির বিশাল ফাইলের ক্ষেত্রে শুধুমাত্র .mp4 ভিডিও অডিও নিষ্কাশন সাপোর্ট করে।';
        showToast(errorMsg);
        return;
      }
    }

    setUploadedFile(file);
    // Reset previous generation when loading new file
    setAccumulatedHeadlines([]);
    setDisplayedHeadlines([]);
    showToast('ফাইল লোড সফল হয়েছে ✓');
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Audio Playback Controllers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setShowFloatingPlayer(true);
        })
        .catch(err => {
          console.error("Audio playback error:", err);
          showToast('প্লে করতে ব্যর্থ হয়েছে');
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const seekToTime = (timeString: string) => {
    if (!audioRef.current) return;
    const parts = timeString.split(':').map(Number);
    if (parts.length < 2) return;
    
    let seconds = 0;
    if (parts.length === 3) {
      // H:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      // MM:SS
      seconds = parts[0] * 60 + parts[1];
    }

    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setShowFloatingPlayer(true);
      });
    }
    showToast(`⏱ ${timeString} সময়ে নিয়ে যাওয়া হয়েছে`);
  };

  // Binary converter
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Keep clean base64 data stream
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  };

  // Sequential Streaming Headline Animator (150ms intervals)
  const triggerStreamingRender = (newHeads: Headline[], isRegenerating: boolean) => {
    if (!isRegenerating) {
      setDisplayedHeadlines([]);
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < newHeads.length) {
        const item = newHeads[index];
        if (item) {
          setDisplayedHeadlines(prev => [...prev, item]);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 150);
  };

  // API Headline Generator
  const generateHeadlines = async (isRegenerating: boolean = false) => {
    if (keySource === 'custom' && !apiKey) {
      showToast('আপনার নিজস্ব Gemini API Key দিন');
      setShowKeyInput(true);
      return;
    }
    if (inputMode === 'media' && !uploadedFile) {
      showToast('আগে একটি ফাইল আপলোড করুন');
      return;
    }
    if (inputMode === 'text' && !inputText.trim()) {
      showToast('বিশ্লেষণ করার জন্য আপনার খবর বা টেক্সটটি লিখুন');
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(10);
      setStatusMessage(inputMode === 'media' ? 'ফাইলটি পড়া হচ্ছে...' : 'টেক্সট বা লেখাটি প্রস্তুত করা হচ্ছে...');

      const contents = [];

      if (inputMode === 'media') {
        setProgress(25);
        setStatusMessage('বেস-৬৪ অডিও রূপান্তর করা হচ্ছে...');
        const base64Data = await readFileAsBase64(uploadedFile!);

        setProgress(45);
        setStatusMessage('এআই ইনস্ট্রাকশন তৈরি করা হচ্ছে...');
        const mimeType = uploadedFile!.type || 'audio/mp3';
        let promptText = videoType === 'news' ? NEWS_MODE_PROMPT : GENERAL_MODE_PROMPT;

        if (speakerName.trim()) {
          promptText = `খবরের প্রধান ব্যক্তি বা বক্তার নাম/পদবি: "${speakerName.trim()}".
গুরুত্বপূর্ণ নির্দেশাবলী:
তুমি যে শিরোনামগুলো তৈরি করবে সেগুলোতে অবশ্যই এই ব্যক্তির নাম এবং পদবির প্রাসঙ্গিক উল্লেখ ব্যবহার করার সর্বোচ্চ চেষ্টা করবে। যেমন: '${speakerName.trim()}-এর ঘোষণা...', '${speakerName.trim()} জানালেন...', '${speakerName.trim()}-এর আশ্বাস...' বা ইত্যাদি বাস্তবসম্মত রূপ।\n\n${promptText}`;
        }

        contents.push({
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        });
      } else {
        // Text Analyze Mode
        setProgress(30);
        setStatusMessage('খবরের তথ্য বিশ্লেষণ প্রসেস শুরু হচ্ছে...');
        let promptText = videoType === 'news' ? TEXT_NEWS_MODE_PROMPT : TEXT_GENERAL_MODE_PROMPT;
        
        if (speakerName.trim()) {
          promptText = `খবরের প্রধান ব্যক্তি বা বক্তার নাম/পদবি: "${speakerName.trim()}".
গুরুত্বপূর্ণ নির্দেশাবলী:
তুমি শিরোনাম বা সামাজিক যোগাযোগমাধ্যমের ক্যাপশনগুলো লেখার সময় এই ব্যক্তির নাম/পদবিকে প্রাসঙ্গিক শিরোনামগুলোতে সুন্দরভাবে ব্যবহার করবে। যেমন: '${speakerName.trim()}-এর...' বা '${speakerName.trim()} নিয়ে...'\n\n${promptText}`;
        }
        
        setProgress(55);
        setStatusMessage('এআই ইনস্ট্রাকশন সেটআপ করা হচ্ছে...');
        
        contents.push({
          parts: [
            {
              text: `বিশ্লেষণ করার টেক্সট:\n"""\n${inputText}\n"""\n\nইনস্ট্রাকশন:\n${promptText}`
            }
          ]
        });
      }

      setProgress(70);
      setStatusMessage('এআই ড্রাইভার প্রস্তুত করা হচ্ছে...');

      let response: Response | null = null;
      let usedKey = '';
      let rotatorIndexToUse = currentRotatorIndex;
      let attempts = 0;
      const MAX_ROTATOR_ATTEMPTS = 15; 
      let success = false;
      let resJson: any = null;

      while (!success && attempts < (keySource === 'rotator' ? MAX_ROTATOR_ATTEMPTS : 1)) {
        try {
          if (keySource === 'rotator') {
            usedKey = SYSTEM_API_KEYS[rotatorIndexToUse];
            setStatusMessage(`এআই ইঞ্জিনে অনুরোধ পাঠানো হচ্ছে [কী #${rotatorIndexToUse + 1}/${SYSTEM_API_KEYS.length}] ...`);
          } else {
            usedKey = apiKey;
            setStatusMessage('এআই ইঞ্জিনে অনুরোধ পাঠানো হচ্ছে (আপনার নিজস্ব কী)...');
          }

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${usedKey}`;

          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
              }
            })
          });

          if (response.ok) {
            resJson = await response.json();
            success = true;
            break;
          }

          const errorVal = response.status;
          console.warn(`API Key index ${rotatorIndexToUse} returned status ${errorVal}`);

          if (keySource === 'rotator') {
            attempts++;
            const nextIdx = (rotatorIndexToUse + 1) % SYSTEM_API_KEYS.length;
            rotatorIndexToUse = nextIdx;
            setCurrentRotatorIndex(nextIdx);
            saveRotatorIndex(nextIdx);

            if (errorVal === 429) {
              showToast(`কী #${rotatorIndexToUse} রেট লিমিট হয়েছে! কী পরিবর্তন করা হচ্ছে...`);
            } else if (errorVal === 403 || errorVal === 400) {
              showToast(`কী #${rotatorIndexToUse} ব্যস্ত বা লিমিট ছুয়েছে! কী পরিবর্তন করা হচ্ছে...`);
            } else {
              showToast(`এপিআই সার্ভার ত্রুটি (${errorVal})! পরবর্তী কী চেষ্টা করা হচ্ছে...`);
            }
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            if (errorVal === 400) {
              showToast('ফাইল ফরম্যাট বা ইনপুট ডেটা সাপোর্টেড নয়');
            } else if (errorVal === 429) {
              showToast('আপনার API রেট লিমিট অতিক্রম করেছে, একটু পর চেষ্টা করুন');
            } else if (errorVal === 403) {
              showToast('আপনার API Key-টি অবৈধ বা কোটা শেষ হয়ে গেছে');
            } else {
              showToast(`ভুল রেসপন্স (${errorVal}), অনুগ্রহ করে আপনার কী চেক করুন`);
            }
            setIsAnalyzing(false);
            setProgress(0);
            return;
          }

        } catch (fetchErr) {
          console.error("Fetch API error:", fetchErr);
          if (keySource === 'rotator') {
            attempts++;
            const nextIdx = (rotatorIndexToUse + 1) % SYSTEM_API_KEYS.length;
            rotatorIndexToUse = nextIdx;
            setCurrentRotatorIndex(nextIdx);
            saveRotatorIndex(nextIdx);
            showToast(`নেটওয়ার্ক ত্রুটি! পরবর্তী কী চেষ্টা করা হচ্ছে...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            showToast('নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে, দয়া করে ইন্টারনেট কানেকশন চেক করুন');
            setIsAnalyzing(false);
            setProgress(0);
            return;
          }
        }
      }

      if (!success) {
        showToast('দুঃখিত, কোনো সচল API কী পাওয়া যায়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন অথবা নিজস্ব কী দিন');
        setIsAnalyzing(false);
        setProgress(0);
        return;
      }

      setProgress(85);
      setStatusMessage('এআই রেসপন্স পার্স করা হচ্ছে...');
      setProgress(95);
      setStatusMessage('শিরোনাম তালিকা ম্যাপ করা হচ্ছে...');

      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty AI response body');
      }

      let parsedData: any = null;
      let sanitized = rawText.trim();

      const repairTruncatedJSON = (jsonStr: string): string => {
        let str = jsonStr.trim();
        if (!str) return '';

        let inString = false;
        let escape = false;
        const stack: string[] = [];

        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === '\\') {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{' || char === '[') {
              stack.push(char);
            } else if (char === '}') {
              if (stack[stack.length - 1] === '{') {
                stack.pop();
              }
            } else if (char === ']') {
              if (stack[stack.length - 1] === '[') {
                stack.pop();
              }
            }
          }
        }

        if (inString) {
          str += '"';
        }

        str = str.trim();
        while (str.endsWith(',') || str.endsWith(':')) {
          str = str.slice(0, -1).trim();
        }

        while (stack.length > 0) {
          const opening = stack.pop();
          if (opening === '{') {
            str += '}';
          } else if (opening === '[') {
            str += ']';
          }
        }

        return str;
      };

      try {
        parsedData = JSON.parse(sanitized);
      } catch (directError) {
        let cleaned = sanitized;
        if (cleaned.includes('```json')) {
          cleaned = cleaned.split('```json')[1].split('```')[0].trim();
        } else if (cleaned.includes('```')) {
          cleaned = cleaned.split('```')[1].split('```')[0].trim();
        }

        try {
          parsedData = JSON.parse(cleaned);
        } catch (markdownError) {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const bracedJson = cleaned.substring(firstBrace, lastBrace + 1);
            try {
              parsedData = JSON.parse(bracedJson);
            } catch (braceError) {
              try {
                const fixedJson = bracedJson.replace(/,(\s*[\]}])/g, '$1');
                parsedData = JSON.parse(fixedJson);
              } catch (trailingError) {
                try {
                  const repairedJson = repairTruncatedJSON(bracedJson);
                  const fixedRepaired = repairedJson.replace(/,(\s*[\]}])/g, '$1');
                  parsedData = JSON.parse(fixedRepaired);
                } catch (repairError) {
                  console.warn("Parsing failed on standard layers.");
                }
              }
            }
          }
        }
      }

      if (!parsedData || !parsedData.headlines || !Array.isArray(parsedData.headlines) || parsedData.headlines.length === 0) {
        const matches = rawText.match(/\{[^{}]*\}/g);
        if (matches) {
          const extractedList: Headline[] = [];
          for (const m of matches) {
            try {
              let itemStr = m.trim().replace(/,(\s*[\]}])/g, '$1');
              const item = JSON.parse(itemStr);
              if (item && typeof item.text === 'string' && typeof item.cat === 'string') {
                extractedList.push({
                  cat: item.cat as any,
                  text: item.text,
                  ts: item.ts || null
                });
              }
            } catch (itemErr) {
              const catMatch = m.match(/"cat"\s*:\s*"([^"]+)"/);
              const textMatch = m.match(/"text"\s*:\s*"([^"]+)"/);
              const tsMatch = m.match(/"ts"\s*:\s*(?:"([^"]+)"|null)/);
              if (catMatch && textMatch) {
                extractedList.push({
                  cat: catMatch[1] as any,
                  text: textMatch[1].replace(/\\"/g, '"'),
                  ts: tsMatch ? (tsMatch[1] || null) : null
                });
              }
            }
          }
          if (extractedList.length > 0) {
            parsedData = { headlines: extractedList };
          }
        }
      }

      if (!parsedData || !parsedData.headlines || !Array.isArray(parsedData.headlines) || parsedData.headlines.length === 0) {
        const plainList: Headline[] = [];
        const lines = rawText.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          
          let detectedCat: 'hard' | 'quote' | 'warning' | 'political' | 'curiosity' | 'general' = 'general';
          let found = false;
          
          for (const cat of ['hard', 'quote', 'warning', 'political', 'curiosity', 'general'] as const) {
            if (line.toLowerCase().includes(cat)) {
              detectedCat = cat;
              found = true;
              break;
            }
          }
          
          let cleanLine = line
            .replace(/^\d+[\s.)-:\u0980-\u09FF]+/g, '')
            .replace(/^[*-]\s*/g, '')
            .trim();
            
          let matchedTs: string | null = null;
          const tsMatch = cleanLine.match(/(?:\(?\b(\d+:\d+)\b\)?)/);
          if (tsMatch) {
            matchedTs = tsMatch[1];
            cleanLine = cleanLine.replace(tsMatch[0], '').trim();
          }
          
          for (const cat of ['hard', 'quote', 'warning', 'political', 'curiosity', 'general']) {
            const catReg = new RegExp(`^${cat}\\s*[:—-]\\[*\\]*\\s*`, 'i');
            cleanLine = cleanLine.replace(catReg, '');
          }
          
          if (cleanLine.length > 6 && !cleanLine.startsWith('{') && !cleanLine.startsWith('}') && !cleanLine.includes('headlines')) {
            plainList.push({
              cat: detectedCat,
              text: cleanLine,
              ts: matchedTs
            });
          }
        }
        if (plainList.length > 0) {
          parsedData = { headlines: plainList };
        }
      }

      const outputHeadlines: Headline[] = parsedData?.headlines || [];

      if (outputHeadlines.length === 0) {
        showToast('কোনো শিরোনাম তৈরি সম্ভব হয়নি, পুনরায় চেষ্টা করুন');
        setIsAnalyzing(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      setStatusMessage('সম্পূর্ণ হয়েছে!');

      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);

        let finalAccumulated: Headline[] = [];
        if (isRegenerating) {
          finalAccumulated = [...accumulatedHeadlines, ...outputHeadlines];
          showToast('নতুন শিরোনাম সংযুক্ত হয়েছে ✓');
        } else {
          finalAccumulated = outputHeadlines;
          showToast('সব শিরোনাম সফলভাবে তৈরি হয়েছে ✓');
        }

        playNotificationChime();

        setAccumulatedHeadlines(finalAccumulated);
        triggerStreamingRender(outputHeadlines, isRegenerating);
      }, 550);

    } catch (e) {
      console.error(e);
      showToast('AI রেসপন্স পার্স করতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  // Helper: Copy logic
  const handleCopy = (text: string, uniqueId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(uniqueId);
      showToast('শিরোনাম কপি হয়েছে ✓');
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(err => {
      console.error("Failed to copy text:", err);
      showToast('কপি করতে ব্যর্থ হয়েছে');
    });
  };

  // Helper: Share logic
  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NewsForge AI Headline',
          text: text
        });
        showToast('শেয়ার করা হয়েছে! ✓');
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      navigator.clipboard.writeText(text).then(() => {
        showToast('শেয়ার সাপোর্ট করে না, কপি করা হয়েছে! ✓');
      }).catch(err => {
        console.error("Failed to copy text:", err);
        showToast('শেয়ার করতে ব্যর্থ হয়েছে');
      });
    }
  };

  // Reset or Refresh App
  const handleRefreshApp = () => {
    setUploadedFile(null);
    setInputText('');
    setSpeakerName('');
    setAccumulatedHeadlines([]);
    setDisplayedHeadlines([]);
    setIsPlaying(false);
    setShowFloatingPlayer(false);
    setCurrentTime(0);
    setDuration(0);
    setCategoryFilter('all');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    showToast('মোড রিসেট করা হয়েছে');
  };

  // Time formatter helper
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Memory calculation helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filter headlines by Category
  const getCategorizedHeadlines = (catKey: string) => {
    return displayedHeadlines.filter(h => h && h.cat === catKey);
  };

  // Get active headlines based on Category settings filter
  const getFilteredHeadlinesList = () => {
    if (categoryFilter === 'all') {
      return displayedHeadlines;
    }
    return displayedHeadlines.filter(h => h && h.cat === categoryFilter);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-[#f0f0f5] font-ui overflow-hidden flex flex-col w-full z-10 transition-all duration-300">
      
      {/* Ambient glow backgrounds from mockup */}
      <div className="ambient">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
      </div>
      
      {/* ── FLOATING TOP AUDIO CONTROLLER BAR ── */}
      {uploadedFile && showFloatingPlayer && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#12121a]/95 border-b border-[rgba(232,93,58,0.25)] shadow-[0_4px_30px_rgba(232,93,58,0.2)] backdrop-blur-md py-3 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-slide-down">
          <div className="flex items-center gap-3 min-w-0 max-w-full md:max-w-[40%]">
            <div className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center transition-all ${isPlaying ? 'bg-[#e85d3a] shadow-[0_0_10px_#e85d3a]' : 'bg-white/10'}`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-white ${isPlaying ? 'animate-ping' : ''}`} />
            </div>
            
            <div className="flex flex-col min-w-0 font-ui">
              <span className="text-[9px] text-[#8a8a9a] font-bold uppercase tracking-wider leading-none mb-0.5">অডিও কন্ট্রোলার (Top Controller)</span>
              <span className="text-xs text-white font-medium truncate select-text leading-tight" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
            </div>
          </div>

          <div className="flex-grow flex items-center gap-4 bg-black/40 border border-white/5 rounded-lg px-4 py-1.5 justify-between">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-[#e85d3a] text-white flex items-center justify-center cursor-pointer transition-all hover:bg-[#ff6b47] hover:scale-105 active:scale-95 shrink-0 shadow-[0_2px_8px_rgba(232,93,58,0.25)]"
              title={isPlaying ? "মিউট করুন / Pause" : "চালু করুন / Play"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-white" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
              )}
            </button>

            <div className="flex-grow flex items-center gap-2.5">
              <span className="text-[10px] text-[#8a8a9a] font-mono select-none">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-grow h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#e85d3a] focus:outline-none"
              />
              <span className="text-[10px] text-[#8a8a9a] font-mono select-none">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              onClick={() => setShowFloatingPlayer(false)}
              className="text-[#8a8a9a] hover:text-[#e85d3a] px-3.5 py-1.5 rounded border border-white/10 hover:border-[#e85d3a]/40 text-[11px] font-semibold cursor-pointer select-none transition-all hover:bg-white/[0.02]"
            >
              Lukan (Hide)
            </button>
          </div>
        </div>
      )}

      {/* Styled feedback toast overlays */}
      <div className="fixed top-12 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none font-ui">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#16161f]/95 border-l-4 border-[#e85d3a] text-[#f0f0f5] text-xs px-4 py-3 rounded-r-lg shadow-2xl flex items-center gap-2 animate-[slideInCard_0.2s_ease_forwards]"
          >
            <Sparkles className="w-4 h-4 text-[#e85d3a] shrink-0" />
            <span className="font-semibold">{toast.msg}</span>
          </div>
        ))}
      </div>

      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-6 pb-24 z-10 relative w-full">
        
        {/* HEADER BRAND AND ACTION BADGES */}
        <header className="flex items-center justify-between pt-4 pb-6 select-none">
          <div className="logo">
            <div className="flex items-center gap-3">
              <div className="logo-icon w-10 h-10 rounded-xl bg-gradient-to-br from-[#e85d3a] to-[#ff6b47] flex items-center justify-center shadow-[0_0_20px_-5px_rgba(232,93,58,0.4)]">
                <svg className="w-5.5 h-5.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h1.5m-1.5 3h1.5m6-6h1.5m-1.5 3h1.5m-7.5 3h1.5m-1.5 3h1.5M6 3v18M3 3h18M3 15h18" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <div className="logo-text font-black text-white text-lg tracking-wide lowercase first-letter:uppercase">NewsForge AI</div>
                <div className="logo-sub font-bangla text-[9px] text-[#8a8a9a] tracking-wider mt-0.5">নিউজফোর্জ এআই</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#8a8a9a] bg-white/[0.02] border border-white/5 py-1.5 px-3 rounded-full">
              <div className="live-dot w-1.5 h-1.5 rounded-full bg-[#e85d3a]"></div>
              <span className="font-semibold">Live Newsroom</span>
            </div>

            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="inline-flex items-center gap-1.5 text-xs text-white bg-gradient-to-r from-[#e85d3a] to-[#ff6b47] py-1.5 px-3.5 rounded-lg shadow-md duration-200 cursor-pointer hover:opacity-90 select-none"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wider text-[9px]">Settings</span>
            </button>
          </div>
        </header>

        {/* HERO BANNER */}
        <section className="hero text-center py-6 pb-8 select-none flex flex-col items-center">
          <div className="hero-badge inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full border border-white/5 bg-[#12121a]/50 text-[10px] text-[#f5a623] uppercase tracking-widest font-ui mb-4">
            <Sparkles className="w-3 h-3 text-[#f5a623]" />
            First of its kind in Bangladesh
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight font-bangla tracking-tight">
            অডিও বা ভিডিও থেকে<br />
            <span className="bg-gradient-to-r from-[#e85d3a] to-[#ff6b47] bg-clip-text text-transparent">সেকেন্ডে নিউজ হেডলাইন</span>
          </h1>
          <p className="text-[#8a8a9a] text-sm md:text-base leading-relaxed mt-4 max-w-xl mx-auto font-bangla font-medium">
            বাংলাদেশের প্রথম এআই-চালিত নিউজ হেডলাইন জেনারেটর। সাংবাদিক, কন্টেন্ট ক্রিয়েটর এবং নিউজরুমের জন্য ৫টি ক্যাটাগরিতে ৩০+ ধারালো, বস্তুনিষ্ঠ শিরোনাম — এক ক্লিকে।
          </p>
        </section>

        {/* HIDDEN LOGICAL AUDIO ENGINE */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* API KEY SETTINGS OVERLAY PANEL */}
        {showKeyInput && (
          <div className="bg-[#12121a] border border-[#e85d3a]/20 rounded-2xl p-5 sm:p-6 shadow-2xl mb-8 relative z-20 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 text-[#e85d3a] font-ui">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-[#e85d3a]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">এপিআই কী সেটিংস (API Management)</h2>
              </div>
              <button 
                onClick={() => setShowKeyInput(false)}
                className="text-white/60 hover:text-[#e85d3a] text-xs underline cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Option 1: System Rotator */}
              <div 
                onClick={() => {
                  setKeySource('rotator');
                  localStorage.setItem('gemini_key_source', 'rotator');
                  showToast('সিস্টেম কী স্বয়ংক্রিয়ভাবে সক্রিয় হয়েছে');
                }}
                className={`border p-4 rounded-xl cursor-pointer transition-all ${
                  keySource === 'rotator' 
                    ? 'bg-[#e85d3a]/5 border-[#e85d3a]/60 shadow-[0_2px_10px_rgba(232,93,58,0.1)]' 
                    : 'bg-black/40 border-white/5 opacity-60 hover:opacity-90 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] bg-[#e85d3a] text-white px-2 py-0.5 rounded font-logo uppercase font-black tracking-wider">SYSTEM FREE API</span>
                  <input 
                    type="radio" 
                    checked={keySource === 'rotator'} 
                    onChange={() => {}} 
                    className="accent-[#e85d3a]"
                  />
                </div>
                <h3 className="text-white font-ui font-bold text-sm mb-1">এআই কী রোটেটর</h3>
                <p className="text-[11px] text-[#8a8a9a] leading-relaxed">
                  সিস্টেমের ফ্রি এপিআই কী পুল ব্যবহার করুন (কোনো নিজস্ব কী লাগবে না)
                </p>
              </div>

              {/* Option 2: Custom Key Input */}
              <div 
                onClick={() => {
                  setKeySource('custom');
                  localStorage.setItem('gemini_key_source', 'custom');
                  showToast('আমার নিজস্ব API Key মোড সক্রিয় হয়েছে');
                }}
                className={`border p-4 rounded-xl cursor-pointer transition-all ${
                  keySource === 'custom' 
                    ? 'bg-[#3b82f6]/5 border-[#3b82f6]/60 shadow-[0_2px_10px_rgba(59,130,246,0.1)]' 
                    : 'bg-black/40 border-white/5 opacity-60 hover:opacity-90 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] bg-[#3b82f6] text-white px-2 py-0.5 rounded font-logo uppercase font-black tracking-wider">CUSTOM KEY</span>
                  <input 
                    type="radio" 
                    checked={keySource === 'custom'} 
                    onChange={() => {}} 
                    className="accent-[#3b82f6]"
                  />
                </div>
                <h3 className="text-white font-ui font-bold text-sm mb-1">আমার নিজস্ব API Key</h3>
                <p className="text-[11px] text-[#8a8a9a] leading-relaxed">
                  আপনার নিজস্ব ফ্রি Gemini API Key ব্যবহার করুন (ব্রাউজার মেমোরিতে সেভ থাকে)
                </p>
              </div>
            </div>

            {keySource === 'custom' && (
              <div className="mb-4 bg-black/40 border border-[#3b82f6]/20 rounded-xl p-4 animate-fadeIn">
                <p className="text-xs text-[#94a3b8] mb-2 font-ui">
                  এখানে গুগলের দেওয়া Gemini API Key দিন:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Gemini API Key টাইপ করুন (AIzaSy...)"
                    className="flex-1 bg-black/60 border border-white/10 rounded px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      className="bg-[#3b82f6] text-white font-ui font-bold px-6 py-3 rounded text-xs tracking-widest uppercase hover:bg-blue-600 active:scale-95 transition-all outline-none shrink-0 cursor-pointer"
                    >
                      সেভ করুন
                    </button>
                    {apiKey && (
                      <button
                        onClick={handleClearApiKey}
                        className="bg-red-950/20 hover:bg-red-900/30 border border-red-500/10 text-red-400 font-ui font-bold px-4 py-3 rounded text-xs hover:text-red-300 transition-all outline-none shrink-0 cursor-pointer"
                      >
                        মুছুন
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="text-[11px] text-[#8a8a9a] font-ui flex items-center gap-1.5 flex-wrap">
                <span>মডেল নির্বাচন (Select Model):</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-md px-2.5 py-1 focus:outline-none text-[#e85d3a] font-mono text-[11px] cursor-pointer"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash (সুপার ফাস্ট)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (উন্নত প্রসেসিং)</option>
                </select>
              </div>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-[#e85d3a] hover:underline flex items-center gap-1 font-ui"
              >
                <span>ফ্রি এপিআই কী তৈরি করুন</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}

        {/* INPUT AND EXECUTION MODULE */}
        <section className="bg-[#12121a] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-xl relative z-10">
          
          {/* Custom Mode selector switches */}
          <div className="mode-bar inline-flex gap-1 p-1 rounded-xl bg-white/[0.04] mb-5">
            <button 
              className={`mode-btn inline-flex items-center gap-1.5 py-2.5 px-4 rounded-lg border-0 text-xs font-bold font-ui cursor-pointer transition-all ${
                inputMode === 'media' 
                  ? 'bg-[#16161f] text-white shadow-md' 
                  : 'bg-transparent text-[#8a8a9a] hover:text-white'
              }`}
              onClick={() => {
                setInputMode('media');
              }}
            >
              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l1.5 1.5M15 9l-1.5 1.5M6 15a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5" />
              </svg>
              Audio / Video File
            </button>
            <button 
              className={`mode-btn inline-flex items-center gap-1.5 py-2.5 px-4 rounded-lg border-0 text-xs font-bold font-ui cursor-pointer transition-all ${
                inputMode === 'text' 
                  ? 'bg-[#16161f] text-white shadow-md' 
                  : 'bg-transparent text-[#8a8a9a] hover:text-white'
              }`}
              onClick={() => {
                setInputMode('text');
              }}
            >
              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Text Script
            </button>
          </div>

          {/* Conditional Input zones matching exactly the styles of the mockup */}
          {inputMode === 'media' ? (
            <div className="space-y-4">
              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInputClick}
                  className={`dropzone border-2 border-dashed rounded-xl py-12 px-6 text-center cursor-pointer overflow-hidden transition-all duration-300 ${
                    isDragging 
                      ? 'border-[#e85d3a] bg-[#e85d3a]/5 cinematic-glow' 
                      : 'border-white/10 bg-black/10 hover:border-[#e85d3a]/40 hover:bg-white/[0.01]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,video/*"
                    className="hidden"
                  />
                  <div className="icon-wrap w-12 h-12 rounded-full bg-white/[0.03] mx-auto mb-3.5 flex items-center justify-center transition-all">
                    <svg className="w-5.5 h-5.5 text-[#e85d3a]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="font-bangla text-sm text-[#f0f0f5] font-semibold">ফাইল ড্র্যাগ করুন অথবা ক্লিক করে বেছে নিন</p>
                  <p className="hint text-[10px] text-[#8a8a9a] mt-1 font-ui tracking-wide">MP3, WAV, M4A, MP4 — সর্বোচ্চ ৩৫ MB</p>
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {/* File card block */}
                  <div className="flex bg-[#e85d3a]/5 border border-[#e85d3a]/15 rounded-xl p-4 items-center gap-3">
                    <svg className="w-[18px] h-[18px] text-[#e85d3a] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span className="text-xs md:text-sm text-white font-semibold flex-1 truncate select-text">
                      {uploadedFile.name}
                    </span>
                    <span className="text-[11px] text-[#8a8a9a] font-mono mr-2 shrink-0 select-none">
                      {formatFileSize(uploadedFile.size)}
                    </span>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setAccumulatedHeadlines([]);
                        setDisplayedHeadlines([]);
                        setIsPlaying(false);
                        setCurrentTime(0);
                        setDuration(0);
                        showToast('ফাইল সরানো হয়েছে');
                      }}
                      className="text-red-400 hover:text-red-300 font-bangla font-semibold text-xs outline-none cursor-pointer shrink-0"
                    >
                      মুছুন (Remove)
                    </button>
                  </div>

                  {/* Waveform Player module */}
                  <div className="audio-box bg-white/[0.01] border border-white/5 rounded-xl p-4">
                    <div className="audio-top flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button 
                          onClick={togglePlay}
                          className="audio-play w-9 h-9 rounded-full bg-[#e85d3a] text-white flex items-center justify-center cursor-pointer transition-all hover:bg-[#ff6b47]"
                          title={isPlaying ? "মিউট করুন / Pause" : "চালু করুন / Play"}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          )}
                        </button>
                        <span className="audio-name text-[11px] text-[#8a8a9a] truncate block" title={uploadedFile.name}>
                          {uploadedFile.name}
                        </span>
                      </div>

                      <span className="text-[10px] text-[#8a8a9a] font-mono whitespace-nowrap sr-only sm:not-sr-only">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 overflow-hidden">
                        <AudioVisualizer 
                          audioElement={audioRef.current} 
                          isPlaying={isPlaying} 
                          uploadedFile={uploadedFile} 
                        />
                      </div>
                      
                      <div className="w-20 md:w-28 flex items-center ml-1 select-none">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e85d3a] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5 animate-fadeIn">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                }}
                placeholder="এখানে সংবাদের স্ক্রিপ্ট বা বক্তব্য পেস্ট করুন..."
                className="w-full min-h-[300px] p-5 rounded-2xl bg-[#12121a]/90 border border-white/10 text-sm sm:text-base text-[#f0f0f5] placeholder:text-[#8a8a9a]/40 font-bangla font-semibold focus:outline-none focus:ring-2 focus:ring-[#e85d3a]/30 focus:border-[#e85d3a] transition-all duration-200 resize-y leading-relaxed shadow-inner"
              />
              <div className="flex justify-between items-center px-1">
                <span className="char-count text-xs text-[#8a8a9a] select-none font-semibold">
                  {inputText.trim().length} অক্ষর ইন্সার্ট হয়েছে
                </span>
                {inputText.trim().length > 0 && (
                  <button
                    onClick={() => {
                      setInputText('');
                      setAccumulatedHeadlines([]);
                      setDisplayedHeadlines([]);
                      showToast('টেক্সট খালি করা হয়েছে');
                    }}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold underline cursor-pointer"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PARAMS CONTROL ZONE: SPEAKERS AND TOPIC ANALYSIS MODELS */}
          {((inputMode === 'media' && uploadedFile) || (inputMode === 'text' && inputText.trim().length > 0)) && (
            <div className="mt-5 pt-4 border-t border-white/5 space-y-4 animate-fadeIn">
              {/* Context speaker prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#e85d3a] uppercase tracking-wider font-ui select-none">
                  বক্তার নাম বা পদবি (ঐচ্ছিক Context Speaker)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="যেমন: ড. মুহাম্মদ ইউনূস, পরিকল্পনামন্ত্রী ইত্যাদি..."
                    className="w-full bg-[#16161f] border border-white/5 rounded-xl px-4 py-3 text-sm text-[#f0f0f5] focus:outline-none focus:border-[#e85d3a] placeholder:text-[#8a8a9a]/30 font-bangla font-semibold"
                  />
                  {speakerName && (
                    <button
                      onClick={() => setSpeakerName('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-red-400 hover:text-red-300 font-bold outline-none cursor-pointer"
                    >
                      মুছুন
                    </button>
                  )}
                </div>
              </div>

              {/* Category radio choices */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#e85d3a] uppercase tracking-wider font-ui select-none">
                  শিরোনাম অ্যানালিটিক্স মোড নির্বাচন করুন
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                  <label 
                    onClick={() => setVideoType('news')}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                      videoType === 'news' 
                        ? 'border-[#e85d3a] bg-[#e85d3a]/5 shadow-[0_2px_10px_rgba(232,93,58,0.06)]' 
                        : 'border-white/5 bg-black/25 opacity-70 hover:opacity-100 hover:border-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name="analysis_video_mode"
                      checked={videoType === 'news'}
                      onChange={() => {}}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-lg shrink-0 ${videoType === 'news' ? 'bg-[#e85d3a] text-white' : 'bg-white/5 text-[#8a8a9a]'}`}>
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-ui text-[13px] font-bold text-white leading-tight">নিউজ ও রাজনৈতিক অ্যানালিটিক্স</p>
                      <p className="text-[10px] text-[#8a8a9a] mt-0.5 font-bangla">খবর, রাজনীতি ও বক্তব্য থেকে ৩০+ শিরোনাম</p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setVideoType('general')}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                      videoType === 'general' 
                        ? 'border-[#e85d3a] bg-[#e85d3a]/5 shadow-[0_2px_10px_rgba(232,93,58,0.06)]' 
                        : 'border-white/5 bg-black/25 opacity-70 hover:opacity-100 hover:border-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name="analysis_video_mode"
                      checked={videoType === 'general'}
                      onChange={() => {}}
                      className="hidden"
                    />
                    <div className={`p-2 rounded-lg shrink-0 ${videoType === 'general' ? 'bg-[#e85d3a] text-white' : 'bg-white/5 text-[#8a8a9a]'}`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-ui text-[13px] font-bold text-white leading-tight">সাধারণ কন্টেন্ট ও সোশ্যাল ক্যাপশন</p>
                      <p className="text-[10px] text-[#8a8a9a] mt-0.5 font-bangla">ভিডিওর জন্য ১০-১৫টি সোশ্যাল মিডিয়া ক্যাপশন ও শিরোনাম</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ACTION SUBMIT BUTTON MATRIX */}
          {((inputMode === 'media' && uploadedFile) || (inputMode === 'text' && inputText.trim().length > 0)) && (
            <div className="flex flex-wrap gap-4 mt-8 justify-center items-center relative z-10 w-full animate-fadeIn select-none">
              <button
                onClick={() => generateHeadlines(false)}
                disabled={isAnalyzing || isExtractingAudio}
                className="btn-primary"
              >
                <Sparkles className="w-5 h-5 text-white animate-bounce shrink-0" />
                <span className="font-bold">হেডলাইন তৈরি করুন</span>
              </button>

              {accumulatedHeadlines.length > 0 && (
                <button
                  onClick={() => generateHeadlines(true)}
                  disabled={isAnalyzing || isExtractingAudio}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-black/40 text-[#e85d3a] border border-[#e85d3a]/25 hover:border-[#e85d3a] font-bold font-ui text-xs tracking-wider transition-all duration-200 hover:bg-[#e85d3a]/5 cursor-pointer disabled:opacity-40 select-none uppercase"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>রিজেনারেট (Regenerate)</span>
                </button>
              )}

              <button
                onClick={handleRefreshApp}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black/25 text-[#8a8a9a] border border-white/5 hover:border-[#e85d3a]/20 hover:text-white font-bold font-ui text-xs tracking-wider transition-all duration-200 cursor-pointer select-none uppercase"
                title="রিসেট করুন"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>রিসেট (Reset)</span>
              </button>
            </div>
          )}
        </section>

        {/* FEEDBACK & STREAMING STATUS OVERLAYS */}
        {isExtractingAudio && (
          <div className="mt-6 relative z-10 animate-fadeIn bg-[#12121a] border border-[#f5a623]/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse shrink-0"></div>
              <div className="flex-1 min-w-0 font-ui text-xs sm:text-sm">
                <p className="font-bangla font-black text-[#f5a623]">ভিডিও ফাইল কোড ট্রান্সলেশন চলছে...</p>
                <p className="text-[10px] text-[#8a8a9a] leading-tight font-bangla mt-0.5">আপনার ফোনের র্যাম সুরক্ষিত রেখে ভিডিওটি থেকে হালকা অডিও ট্র্যাক বের করা হচ্ছে</p>
              </div>
              <span className="font-logo text-[9px] bg-[#f5a623]/10 border border-[#f5a623]/25 px-2.5 py-1 rounded text-[#f5a623] shrink-0 font-bold tracking-wide">
                RAM SAFE DECODER
              </span>
            </div>

            <div className="h-1 bg-white/5 rounded overflow-hidden">
              <div 
                className="bg-[#f5a623] h-full transition-all duration-300 shadow-[0_0_8px_rgba(245,166,35,0.4)]"
                style={{ width: `${extractionProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 font-logo text-[9px] text-[#8a8a9a] font-bold tracking-wide">
              <span>DECODING DIRECTORY</span>
              <span>{extractionProgress}% COMPLETE</span>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="mt-6 relative z-10 bg-[#12121a] border border-[#e85d3a]/20 rounded-xl p-4 shadow-lg animate-fadeIn text-sm font-ui">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-2 h-2 rounded-full bg-[#e85d3a] animate-pulse shrink-0"></div>
              <p className="font-bangla font-semibold text-[#e85d3a] flex-grow leading-tight">
                {statusMessage}
              </p>
              <span className="text-[9px] font-logo uppercase font-black text-[#8a8a9a] border border-white/5 bg-white/[0.02] px-2 py-0.5 rounded shrink-0">
                AI ANALYSIS STREAM
              </span>
            </div>

            <div className="h-1 bg-white/5 rounded overflow-hidden">
              <div 
                className="bg-[#e85d3a] h-full transition-all duration-300 shadow-[0_0_8px_rgba(232,93,58,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 font-logo text-[9px] text-[#8a8a9a] font-bold tracking-wide">
              <span>GEMINI INTEGRATION MODULE</span>
              <span>{progress}% GENERATED</span>
            </div>
          </div>
        )}

        {/* HEADLINES RESULTS WORKFLOW */}
        {displayedHeadlines.length > 0 && (
          <section id="results" className="mt-8 space-y-4 animate-fadeIn relative z-10 w-full scroll-mt-20">
            <div className="results-head flex items-end justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold font-bangla text-white">তৈরি হওয়া হেডলাইন</h2>
                <p className="text-xs text-[#8a8a9a] font-bangla mt-1">
                  {videoType === 'news' ? 'মোট ৩০টি শিরোনাম — ৫টি ক্যাটাগরিতে' : 'সোশ্যাল মিডিয়া থাম্বনেল ও ক্যাপশন জেনারেটর'}
                </p>
              </div>
              <span className="category-pill flex items-center gap-1.5 py-1 px-3 bg-[#e85d3a]/15 text-[#e85d3a] rounded-lg text-[10px] font-logo font-bold uppercase select-none shadow">
                <div className="live-dot w-1.5 h-1.5 rounded-full bg-[#e85d3a]"></div>
                Generated
              </span>
            </div>

            {/* Sub-categories tab switches identical to mockup filters design */}
            {videoType === 'news' && (
              <div className="filters flex flex-wrap gap-2 select-none font-ui">
                <button 
                  onClick={() => setCategoryFilter('all')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'all' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  সব (All)
                </button>
                <button 
                  onClick={() => setCategoryFilter('hard')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'hard' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  Hard News
                </button>
                <button 
                  onClick={() => setCategoryFilter('quote')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'quote' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  উদ্ধৃতি (Quote)
                </button>
                <button 
                  onClick={() => setCategoryFilter('warning')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'warning' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  সতর্কতা
                </button>
                <button 
                  onClick={() => setCategoryFilter('political')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'political' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  রাজনৈতিক
                </button>
                <button 
                  onClick={() => setCategoryFilter('curiosity')}
                  className={`filter-btn py-1.5 px-3.5 rounded-lg text-xs font-bold font-bangla cursor-pointer transition-all border ${
                    categoryFilter === 'curiosity' 
                      ? 'bg-[#e85d3a]/15 text-[#e85d3a] border-[#e85d3a]/25' 
                      : 'bg-transparent text-[#8a8a9a] border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  কিউরিওসিটি
                </button>
              </div>
            )}

            {/* Generated headlines container rendering list styled like original mock item cards */}
            <div className="space-y-3">
              {getFilteredHeadlinesList().map((headline, idx) => {
                const uniqueId = `headline-${headline.cat}-${idx}`;
                const config = CATEGORIES[headline.cat as keyof typeof CATEGORIES] || CATEGORIES.general;
                
                return (
                  <div
                    key={uniqueId}
                    className="headline-card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 rounded-r-xl border-l-[3px] border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-200"
                    style={{ borderLeftColor: config.color } as React.CSSProperties}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bangla text-sm text-white/95 leading-relaxed font-semibold select-text">
                        {headline.text}
                      </p>
                    </div>

                    <div className="headline-meta flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 border-white/5 pt-2.5 md:pt-0 font-ui select-none">
                      <span 
                        className="tag text-[9px] font-bold tracking-widest uppercase py-1 px-2.5 rounded bg-white/[0.03] border border-white/5 text-[#8a8a9a]"
                        style={{ color: config.color }}
                      >
                        {headline.cat.toUpperCase()}
                      </span>

                      {headline.ts && (
                        <button
                          onClick={() => seekToTime(headline.ts as string)}
                          className="timestamp-badge inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded py-1 px-2.5 font-logo text-[9px] text-[#8a8a9a] hover:border-[#e85d3a] hover:text-white transition-all cursor-pointer font-bold shrink-0"
                          title={`${headline.ts} তে যান`}
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>{headline.ts}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShare(headline.text)}
                          className="copy-btn w-7.5 h-7.5 rounded-lg border border-white/5 bg-transparent hover:border-[#e85d3a] text-[#8a8a9a] hover:text-white cursor-pointer flex items-center justify-center shrink-0"
                          title="শেয়ার করুন"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(headline.text, uniqueId)}
                          className="copy-btn w-7.5 h-7.5 rounded-lg border border-white/5 bg-transparent hover:border-[#e85d3a] text-[#8a8a9a] hover:text-white cursor-pointer flex items-center justify-center shrink-0"
                          title="কপি করুন"
                        >
                          {copiedId === uniqueId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* STATS FEATURES TILES CONTAINER - HIDDEN IN RESULTS SCREEN MODE FOR DESIGN CLEANLINESS */}
        {displayedHeadlines.length === 0 && (
          <section className="features grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 animate-fadeIn relative z-10 w-full select-none font-ui">
            <div className="feature border border-white/5 bg-[#12121a]/50 p-5 rounded-2xl">
              <div className="label text-[9px] tracking-widest font-black uppercase text-[#f5a623] mb-1">Feature</div>
              <h3 className="text-white text-base font-bold font-bangla mb-1">৩০+ হেডলাইন</h3>
              <p className="text-xs text-[#8a8a9a] font-bangla leading-relaxed mt-1 font-medium">৫টি সুনির্দিষ্ট এবং ধারালো ক্যাটাগরিতে এক ক্লিকে শিরোনাম তৈরি।</p>
            </div>
            <div className="feature border border-white/5 bg-[#12121a]/50 p-5 rounded-2xl">
              <div className="label text-[9px] tracking-widest font-black uppercase text-[#f5a623] mb-1">Feature</div>
              <h3 className="text-white text-base font-bold font-bangla mb-1">টাইমস্ট্যাম্প</h3>
              <p className="text-xs text-[#8a8a9a] font-bangla leading-relaxed mt-1 font-medium">কোমর শক্ত বক্তব্য বা হুবহু কোটের সঠিক সেকেন্ড ট্র্যাক সনাক্তকরণ।</p>
            </div>
            <div className="feature border border-white/5 bg-[#12121a]/50 p-5 rounded-2xl">
              <div className="label text-[9px] tracking-widest font-black uppercase text-[#f5a623] mb-1">Feature</div>
              <h3 className="text-white text-base font-bold font-bangla mb-1">নির্ভুল ও বস্তুনিষ্ঠ</h3>
              <p className="text-xs text-[#8a8a9a] font-bangla leading-relaxed mt-1 font-medium">কোনো বানিয়ে দেওয়া তথ্য বা কাল্পনিক তথ্য যোগ করে না (Zero Hallucination)।</p>
            </div>
          </section>
        )}
      </main>

      {/* DETAILED INFORMATION MODAL GUIDEBOX */}
      {infoModalTab && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-ui"
          onClick={() => setInfoModalTab(null)}
        >
          <div 
            className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative animate-[scaleUp_0.2s_ease_out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-white/5 bg-[#12121a]">
              <div className="flex items-center gap-2.5">
                {infoModalTab === 'privacy' ? (
                  <ShieldCheck className="w-5 h-5 text-[#e85d3a]" />
                ) : (
                  <BookOpen className="w-5 h-5 text-[#e85d3a]" />
                )}
                <h3 className="font-bangla text-base font-black text-white leading-none">
                  {infoModalTab === 'privacy' ? 'প্রাইভেসি ও ডেটা নিরাপত্তা পলিসি' : 'ব্যবহার নির্দেশিকা এবং সাপোর্ট ডেস্ক'}
                </h3>
              </div>
              <button 
                onClick={() => setInfoModalTab(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8a8a9a] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Switch Tabs */}
            <div className="flex border-b border-white/5 bg-black/40 select-none">
              <button
                onClick={() => setInfoModalTab('support')}
                className={`flex-1 py-3 text-center text-xs font-bold font-ui uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  infoModalTab === 'support' 
                    ? 'border-[#e85d3a] text-white bg-[#12121a]/30' 
                    : 'border-transparent text-[#8a8a9a] hover:text-white'
                }`}
              >
                ব্যবহার ও সাপোর্ট (Support)
              </button>
              <button
                onClick={() => setInfoModalTab('privacy')}
                className={`flex-1 py-3 text-center text-xs font-bold font-ui uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  infoModalTab === 'privacy' 
                    ? 'border-[#e85d3a] text-white bg-[#12121a]/30' 
                    : 'border-transparent text-[#8a8a9a] hover:text-white'
                }`}
              >
                প্রাইভেসি পলিসি (Privacy)
              </button>
            </div>

            {/* Modal Body Scroll section */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 select-text">
              {infoModalTab === 'support' ? (
                <div className="space-y-4 font-bangla font-medium">
                  <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-4">
                    <h4 className="text-xs text-[#e85d3a] font-black mb-1.5 uppercase">১. এই সাইটটির লক্ষ্য ও উদ্দেশ্য:</h4>
                    <p className="text-xs text-[#8a8a9a] leading-relaxed">
                      এটি একটি এআই-চালিত বাংলা সংবাদ ও অডিও/ভিডিও কন্টেন্ট অ্যানালাইজার। এর মূল কাজ হলো রাজনৈতিক বক্তব্য, সংবাদ বুলেটিন ও বিভিন্ন প্রবন্ধ বিশ্লেষণ করে প্রফেশনাল সংবাদ শিরোনাম তৈরি করা, যাতে সাংবাদিকদের মূল্যবান সময় বাঁচে।
                    </p>
                  </div>

                  <div className="border-l-2 border-[#f5a623] bg-[#f5a623]/5 p-4 rounded-r-xl">
                    <h4 className="text-xs text-[#f5a623] font-black mb-1.5 uppercase">২. সাইটটি যেভাবে চমৎকার কাজ করে:</h4>
                    <ul className="list-disc list-inside text-xs text-[#8a8a9a] space-y-2 mt-1 leading-relaxed">
                      <li>
                        <strong className="text-white">টেক্সট স্ক্রিপ্ট মোড:</strong> যেকোনো লেখার অংশ প্যারাগ্রাফ পেস্ট করুন এবং এক ক্লিকে বস্তুনিষ্ঠ ৩০+ শিরোনাম পান।
                      </li>
                      <li>
                        <strong className="text-white">অডিও বা বড় ভিডিও ফাইল:</strong> আমাদের সাইটে বিশাল সাইজের ফাইল দিলেও সমস্যা নেই! মোবাইল ব্রাউজার র্যাম ক্র্যাশ প্রতিরোধ করার জন্য আমরা ক্লায়েন্ট মেশিনে ভিডিওর সাউন্ড ট্র্যাক (অডিও সাউন্ড ফাইল) এক্সট্র্যাক্ট করে হালকা AAC ফরম্যাটে রূপান্তর করে ফেলি।
                      </li>
                    </ul>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[#ef4444] border-b border-white/5 pb-2">
                      <AlertCircle className="w-4 h-4" />
                      <h4 className="text-xs font-black uppercase">৩. কোনো ত্রুটি বা ব্যর্থতা দেখা দিলে সমাধান</h4>
                    </div>

                    <div className="space-y-2 text-xs text-[#8a8a9a]">
                      <p>
                        <strong className="text-white">১ম ধাপ:</strong> আপনার ইন্টারনেট কানেকশন নিশ্চিত করুন এবং মূল পেজটি পুনরায় রিলোড (Refresh/F5) দিন। পেজ রিলোড দিলে মেমোরি ফ্লাশ গতি বৃদ্ধি পায়।
                      </p>
                      <p>
                        <strong className="text-white">২য় ধাপ:</strong> উপরে থাকা "মডেল সেটিংস" থেকে অন্য একটি এআই মডেল সিলেক্ট করুন। মাঝেমাঝে ফ্রি কীগুলোর উপর চাপ পড়তে পারে। সম্ভব হলে আপনার ব্যক্তিগত API Key ব্যবহার করুন।
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#e85d3a]/5 border border-[#e85d3a]/15 rounded-xl p-4 text-center">
                    <p className="text-xs text-white mb-1.5 font-bold">যেকোনো প্রকার সাপোর্ট বা পরামর্শের জন্য আমাদের মেইল করুন</p>
                    <p className="text-[11px] text-[#8a8a9a]">২৪/৭ অফিসিয়াল যোগাযোগ: <span className="text-white font-mono select-all hover:text-[#e85d3a]">saiedalmahdi31@gmail.com</span></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-bangla font-medium">
                  <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-[#e85d3a] mb-2 font-ui">
                      <ShieldCheck className="w-4.5 h-4.5 text-[#e85d3a]" />
                      <h4 className="text-xs font-black uppercase">১. ১০০% ডেকোডিং নিরাপত্তা (Offline Decoder)</h4>
                    </div>
                    <p className="text-xs text-[#8a8a9a] leading-relaxed">
                      আপনার ফাইল, অনুবাদ এবং টেক্সট স্ক্রিপ্ট সুরক্ষিত। আমরা আপনার কোনো ফাইল, ভয়েস সারসংক্ষেপ বা শিরোনাম কোনো দূরবর্তী ডেটাবেজে সংরক্ষণ করি না। ব্রাউজার রিলোড দেওয়ার সাথে সাথে ক্যাশ মেমোরি থেকে সব স্থায়ীভাবে ফ্লাশ হয়ে যায়।
                    </p>
                  </div>

                  <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-4">
                    <h4 className="text-xs text-[#e85d3a] font-black mb-1.5 uppercase">২. Google Gemini compliance</h4>
                    <p className="text-xs text-[#8a8a9a] leading-relaxed">
                      আমরা গুগলের অফিশিয়াল এআই ড্রাইভার ব্যবহার করি। এখানে আপলোড করা বা পাঠানো কন্টেন্ট গুগলে কোনো এআই মডেল ট্রেনিং-এর জন্য ব্যবহৃত হয় না এবং সার্চ ইঞ্জিনে তালিকাভুক্ত হয় না। অধিকার সম্পূর্ণ আপনার কাছেই সুরক্ষিত থাকে।
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 border-t border-white/5 bg-[#12121a] flex items-center justify-between">
              <span className="text-[10px] text-[#8a8a9a] font-bold uppercase tracking-wider select-none font-logo">SECURE SHELL CONNECTION</span>
              <button
                onClick={() => setInfoModalTab(null)}
                className="bg-[#e85d3a] hover:bg-[#ff6b47] text-white font-bangla text-xs px-5 py-2 rounded-lg font-bold shadow-md transition-all cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER BAR FROM COMPACT LAYOUT */}
      <footer className="mt-auto py-6 px-4 border-t border-white/5 select-none relative z-10 w-full bg-black/40 text-[#8a8a9a] text-[11px] font-ui">
        <div className="max-w-[860px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-ui tracking-wide">
            <div className={`w-2 h-2 rounded-full shadow-[0_2px_8px_rgba(232,93,58,0.3)] ${isAnalyzing ? 'bg-amber-500 animate-pulse' : 'bg-[#e85d3a]'}`}></div>
            <span>
              {isAnalyzing ? "Analyzing speech file or audio stream..." : "System Online • All AI models optimal"}
            </span>
          </div>
          
          <div className="footer-credit flex items-center justify-center gap-1.5 font-ui">
            <span>© {new Date().getFullYear()} NewsForge AI · Created by</span>
            <a 
              href="https://www.facebook.com/saeedalmahdi24" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[#e85d3a] hover:opacity-80 transition-all font-bold flex items-center gap-1 select-text"
            >
              <svg className="fb-icon w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#e85d3a">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              Saeed Al Mahdi
            </a>
          </div>

          <div className="flex gap-4 select-none text-[10px] uppercase font-bold tracking-wider">
            <span onClick={() => setInfoModalTab('support')} className="hover:text-white cursor-pointer transition-colors">Support</span>
            <span onClick={() => setInfoModalTab('privacy')} className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span onClick={() => setInfoModalTab('support')} className="hover:text-white cursor-pointer transition-colors">Doc</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
