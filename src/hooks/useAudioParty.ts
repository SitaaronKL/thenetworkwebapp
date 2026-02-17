
import { useEffect, useRef, useState } from 'react';

const PLAYLIST = [
    { src: '/mcmaster/Chris Lake - Savana [Official Visualizer].mp3' },
];
const START_OFFSET_SECONDS = 18;
const POST_DROP_WINDOW_MS = 12000;

type AudioWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};
type ScenePhase = 'normal' | 'build' | 'drop' | 'afterglow';

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
    const [scenePhase, setScenePhase] = useState<ScenePhase>('normal');
    const [postDropStrength, setPostDropStrength] = useState(0);
    const [phaseVariant, setPhaseVariant] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);

    // Analysis state (refs for performance in loop)
    const lastBeatTimeRef = useRef(0);
    const energyHistoryRef = useRef<number[]>([]);
    const bassHistoryRef = useRef<number[]>([]);
    const wasMajorDropRef = useRef(false);
    const lastMajorDropEndedAtRef = useRef(-Infinity);

    function analyze(now: number) {
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
        if (normalizedBass > threshold && normalizedBass > 0.4 && timeSinceLastBeat > BEAT_INTERVAL * 0.65) {
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
        const isDropNow = isBeatNow && normalizedBass > threshold * 1.15;
        const shortWindow = energyHistory.slice(-10);
        const prevWindow = energyHistory.slice(-20, -10);
        const shortAvg = shortWindow.length ? shortWindow.reduce((a, b) => a + b, 0) / shortWindow.length : 0;
        const prevAvg = prevWindow.length ? prevWindow.reduce((a, b) => a + b, 0) / prevWindow.length : shortAvg;
        const rise = Math.max(0, shortAvg - prevAvg);
        const buildSignal = Math.max(0, Math.min(1, rise * 7 + Math.max(0, shortAvg - 0.45) * 1.7));

        if (!wasMajorDropRef.current && isMajor) {
            setPhaseVariant(v => (v + 1) % 4);
        } else if (wasMajorDropRef.current && !isMajor) {
            lastMajorDropEndedAtRef.current = now;
            const seed = Math.sin(now * 0.00173);
            const nextVariant = Math.floor(((seed + 1) * 0.5) * 4) % 4;
            setPhaseVariant(nextVariant);
        }
        wasMajorDropRef.current = isMajor;

        const sinceMajorDropMs = now - lastMajorDropEndedAtRef.current;
        const isAfterglow = !isMajor && sinceMajorDropMs >= 0 && sinceMajorDropMs < POST_DROP_WINDOW_MS;
        const nextPostDropStrength = isAfterglow ? 1 - sinceMajorDropMs / POST_DROP_WINDOW_MS : 0;
        const nextScenePhase: ScenePhase = isMajor
            ? 'drop'
            : isAfterglow
                ? 'afterglow'
                : buildSignal > 0.2
                    ? 'build'
                    : 'normal';

        // Detect "Drop pulse" simply on beat
        if (isBeatNow) {
            setDropPulse(p => p + 1);
        }

        // Update state (throttled/smoothed if needed in real app, but React handles this okay for small updates)
        setIsBeatDrop(isDropNow);
        setIsBeat(isBeatNow);
        setBeatStrength(prev => (isBeatNow ? currentBeatStrength : Math.max(0, prev * 0.88))); // decay
        setIsMajorDrop(isMajor);
        setMajorDropStrength(isMajor ? (recentEnergy - 0.7) * 3 : 0);
        setDropStrength(normalizedBass);
        setBuildUpStrength(prev => (isMajor ? 0 : Math.max(buildSignal, prev * 0.9)));
        setScenePhase(nextScenePhase);
        setPostDropStrength(nextPostDropStrength);

        rafRef.current = requestAnimationFrame(analyze);
    }

    const startParty = () => {
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
        audio.preload = 'auto';
        audioRef.current = audio;

        const seekToStartOffset = () => {
            if (Number.isFinite(audio.duration) && audio.duration <= START_OFFSET_SECONDS) return;
            try {
                audio.currentTime = START_OFFSET_SECONDS;
            } catch {
                // Some browsers reject seeking before metadata is available.
            }
        };

        seekToStartOffset();
        audio.addEventListener('loadedmetadata', seekToStartOffset, { once: true });

        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;

        // Connect: Source -> Analyser -> Destination
        source.connect(analyser);
        analyser.connect(ctx.destination);

        // Start analysis loop
        rafRef.current = requestAnimationFrame(analyze);

        audio.play().then(() => {
            setHasStarted(true);
        }).catch((e) => console.error('Playback failed:', e));
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
        scenePhase,
        postDropStrength,
        phaseVariant,
    };
}
