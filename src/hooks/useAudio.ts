import { useState, useEffect, useRef } from 'react';

export function useAudio() {
  const [volume, setVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let animationFrame: number;

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVolume(avg / 255); // Normalized 0-1
          animationFrame = requestAnimationFrame(update);
        };
        update();
      } catch (err) {
        console.warn('Microphone access denied', err);
      }
    };

    startMic();

    return () => {
      cancelAnimationFrame(animationFrame);
      streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    };
  }, []);

  return { volume };
}
