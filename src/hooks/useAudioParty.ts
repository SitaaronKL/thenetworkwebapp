
import { useEffect, useRef, useState, useCallback } from 'react';

const PLAYLIST = [
    { src: '/mcmaster/Chris Lake - Savana [Official Visualizer].mp3' },
];

type AudioWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};

// 128 BPM = ~468ms per beat
const BPM = 128;
const BEAT_INTERVAL = (60 / BPM) * 1000;

export function useAudioParty() {
    const [hasStarted, setHasStarted] = useState(false);
    const [isBeatDrop, setIsBeatDrop] = useState(false);
    const [isBeat, setIsBeat] = useState(false);
    const [dropStrength, setDropStrength] = useState(0);
    const [isMajorDrop, setIsMajorDrop] = useState(false);
    const [majorDropStrength, setMajorDropStrength] = useState(0);
    const [beatStrength, setBeatStrength] = useState(0);
    const [buildUpStrength, setBuildUpStrength] = useState(0);
    const [dropPulse, setDropPulse] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);

    // Analysis state (refs for performance in loop)
    const lastBeatTimeRef = useRef(0);
    const energyHistoryRef = useRef<number[]>([]);
    const bassHistoryRef = useRef<number[]>([]);

    const startParty = useCallback(() => {
        if (hasStarted) return;

        const audioWindow = window as AudioWindow;
        const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
        if (!AudioContextClass) {
            console.error('Web Audio API is not supported in this browser.');
            return;
        }

        const ctx = new AudioContextClass();
        contextRef.current = ctx;
        ctx.resume().catch(() => undefined);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; // Good resolution for bass
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = PLAYLIST[0].src;
        audio.loop = true;
        audio.volume = 0.8;
        audioRef.current = audio;

        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;

        // Connect: Source -> Analyser -> Destination
        source.connect(analyser);
        analyser.connect(ctx.destination);

        // Start analysis loop
        analyze();

        audio.play().then(() => {
            setHasStarted(true);
        }).catch((e) => console.error('Playback failed:', e));
    }, [hasStarted]);

    const analyze = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // 1. Calculate Bass Energy (Sub-bass + Bass: 20Hz - 250Hz)
        // FFT Size 2048 @ 44.1kHz -> ~21.5Hz per bin
        // Bins 0-12 cover ~0-250Hz
        let bassEnergy = 0;
        for (let i = 0; i < 12; i++) {
            bassEnergy += dataArray[i];
        }
        bassEnergy /= 12; // Average bass volume (0-255)

        // Normalize bass (0-1)
        const normalizedBass = bassEnergy / 255;

        // 2. Beat Detection logic (Simple energy threshold)
        const now = Date.now();
        const timeSinceLastBeat = now - lastBeatTimeRef.current;

        // Dynamic threshold based on recent history
        const bassHistory = bassHistoryRef.current;
        bassHistory.push(normalizedBass);
        if (bassHistory.length > 50) bassHistory.shift();

        const avgBass = bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length || 0;
        const threshold = avgBass * 1.3; // 1.3x average energy triggers beat

        let currentBeatStrength = 0;
        let isBeatNow = false;

        // Check for beat (with debounce based on BPM)
        if (normalizedBass > threshold && normalizedBass > 0.4 && timeSinceLastBeat > 300) {
            isBeatNow = true;
            lastBeatTimeRef.current = now;
            currentBeatStrength = (normalizedBass - avgBass) * 2; // enhance peak
        }

        // 3. Drop Detection (Sustained high energy after buildup)
        // Ideally we'd use predefined timestamps, but for now we look for huge energy jumps
        const energyHistory = energyHistoryRef.current;
        energyHistory.push(normalizedBass);
        if (energyHistory.length > 200) energyHistory.shift();

        // Detect "Major Drop": Very high sustained bass
        const recentEnergy = energyHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const isMajor = recentEnergy > 0.7; // Hard threshold for heavy drops

        // Detect "Drop pulse" simply on beat
        if (isBeatNow) {
            setDropPulse(p => p + 1);
        }

        // Update state (throttled/smoothed if needed in real app, but React handles this okay for small updates)
        setIsBeat(isBeatNow);
        setBeatStrength(isBeatNow ? currentBeatStrength : Math.max(0, beatStrength * 0.9)); // decay
        setIsMajorDrop(isMajor);
        setMajorDropStrength(isMajor ? (recentEnergy - 0.7) * 3 : 0);
        setDropStrength(normalizedBass);
        setBuildUpStrength(Math.max(0, normalizedBass - 0.3));

        rafRef.current = requestAnimationFrame(analyze);
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (contextRef.current) contextRef.current.close();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return {
        startParty,
        hasStarted,
        isBeatDrop,
        isBeat,
        dropStrength,
        isMajorDrop,
        majorDropStrength,
        beatStrength,
        buildUpStrength,
        dropPulse,
    };
}
