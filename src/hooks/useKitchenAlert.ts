import { useRef, useCallback, useEffect, useState } from 'react';

// Preset audio file URL for kitchen alerts (NAWA custom sound)
export const PRESET_AUDIO_URL = 'https://files.catbox.moe/x0nryt.wav';

// Sound definitions with MAXIMUM VOLUME for loud kitchen environments
const soundLibrary: Record<string, (ctx: AudioContext) => void> = {
  chime: (ctx) => {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1.0, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  },
  bell: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },
  doorbell: (ctx) => {
    [523.25, 392].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(1.0, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  },
  alarm: (ctx) => {
    [0, 0.12, 0.24, 0.36].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      osc.type = 'square';
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(1.0, start);
      gain.gain.setValueAtTime(0, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  },
  notification: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1318.51;
    osc.type = 'sine';
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  },
  success: (ctx) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(1.0, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.18);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  },
  cash: (ctx) => {
    [1500, 2000, 2500].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.04;
      gain.gain.setValueAtTime(1.0, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  },
  xylophone: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1174.66;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  },
  gong: (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 130.81;
    osc.type = 'sine';
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  },
  triple: (ctx) => {
    [0, 0.15, 0.3].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(1.0, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }
};

export interface UseKitchenAlertOptions {
  soundId: string;
  customAudioUrl?: string;
  maxDuration?: number; // Default 150000ms (2.5 min)
  onTimeout?: () => void;
}

/**
 * Utility to forcefully prevent iOS/Android devices from sleeping 
 * by injecting an invisible HTML5 video into the DOM.
 */
const createAndPlayWakeLockVideo = () => {
  let wakeVideo = document.getElementById('nawa-wake-lock-video') as HTMLVideoElement;
  if (!wakeVideo) {
    wakeVideo = document.createElement('video');
    wakeVideo.id = 'nawa-wake-lock-video';
    wakeVideo.setAttribute('playsinline', '');
    wakeVideo.setAttribute('muted', '');
    wakeVideo.setAttribute('loop', '');

    // Extremely small, silent base64 video to trick iOS and Android into not sleeping
    wakeVideo.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAGzABAHAAABthAHAAABthAHAAAAF21vb3YAAABsbXZoZAAAAADamfI92pnyPQEA...';
    wakeVideo.style.position = 'absolute';
    wakeVideo.style.width = '1px';
    wakeVideo.style.height = '1px';
    wakeVideo.style.opacity = '0';
    wakeVideo.style.pointerEvents = 'none';
    document.body.appendChild(wakeVideo);
  }

  try {
    wakeVideo.play().catch(() => { });
  } catch (e) { }
};

/**
 * Continuous kitchen alert system with:
 * - Tighter synth loop (500ms interval) for built-in sounds
 * - HTML5 Audio with loop=true for custom audio URLs
 * - 2.5 minute safety auto-stop
 */
export const useKitchenAlert = (options: UseKitchenAlertOptions | string = 'chime') => {
  // Support both old string API and new options object
  const config: UseKitchenAlertOptions = typeof options === 'string'
    ? { soundId: options }
    : options;

  const {
    soundId = 'chime',
    customAudioUrl,
    maxDuration = 150000, // 2.5 minutes
    onTimeout
  } = config;

  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentSoundRef = useRef(soundId);
  const customUrlRef = useRef(customAudioUrl);

  // Update refs when props change
  useEffect(() => {
    currentSoundRef.current = soundId;
  }, [soundId]);

  useEffect(() => {
    customUrlRef.current = customAudioUrl;
  }, [customAudioUrl]);

  // Initialize AudioContext on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a single synth sound
  const playSynthSound = useCallback(() => {
    const ctx = initAudioContext();
    if (!ctx) return;
    const soundFn = soundLibrary[currentSoundRef.current] || soundLibrary.chime;
    soundFn(ctx);
  }, [initAudioContext]);

  // Start the continuous alert
  const startAlert = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);

    const useCustomAudio = currentSoundRef.current === 'custom' && customUrlRef.current;

    if (useCustomAudio) {
      // Use HTML5 Audio with loop for custom audio files
      try {
        const audio = new Audio(customUrlRef.current);
        audio.loop = true;
        audio.volume = 1.0;
        htmlAudioRef.current = audio;

        // Wake Lock Hack
        createAndPlayWakeLockVideo();

        audio.play().catch(err => {
          console.error('Failed to play custom audio:', err);
          // Fallback to synth if audio fails
          startSynthLoop();
        });
      } catch (err) {
        console.error('Error creating audio element:', err);
        startSynthLoop();
      }
    } else {
      // Use synth sound with tight loop
      startSynthLoop();
    }

    // Set up 2.5 minute safety timeout
    timeoutRef.current = setTimeout(() => {
      stopAlertInternal();
      onTimeout?.();
    }, maxDuration);

  }, [isPlaying, maxDuration, onTimeout, playSynthSound]);

  const startSynthLoop = useCallback(() => {
    // Play immediately
    playSynthSound();

    // Wake Lock Hack
    createAndPlayWakeLockVideo();

    // Then repeat every 500ms (tighter loop for continuous feel)
    intervalRef.current = setInterval(() => {
      playSynthSound();
    }, 500);
  }, [playSynthSound]);

  // Internal stop function
  const stopAlertInternal = useCallback(() => {
    // Stop synth loop
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop HTML5 audio
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
      htmlAudioRef.current = null;
    }

    // Clear safety timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  // Public stop function
  const stopAlert = useCallback(() => {
    stopAlertInternal();
  }, [stopAlertInternal]);

  // Test a custom audio URL (one-shot, no loop)
  const testCustomAudio = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.volume = 1.0;

        audio.oncanplaythrough = () => {
          audio.play()
            .then(() => {
              setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
              }, 3000); // Play for 3 seconds
              resolve(true);
            })
            .catch(() => resolve(false));
        };

        audio.onerror = () => resolve(false);
        audio.load();
      } catch {
        resolve(false);
      }
    });
  }, []);

  // Loop test a custom audio URL
  const testCustomAudioLoop = useCallback((url: string, duration: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = 1.0;

        audio.oncanplaythrough = () => {
          audio.play()
            .then(() => {
              setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
              }, duration);
              resolve(true);
            })
            .catch(() => resolve(false));
        };

        audio.onerror = () => resolve(false);
        audio.load();
      } catch {
        resolve(false);
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isPlaying,
    startAlert,
    stopAlert,
    initAudioContext,
    testCustomAudio,
    testCustomAudioLoop,
  };
};

export default useKitchenAlert;
