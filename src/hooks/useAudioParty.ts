
import { useEffect, useRef, useState, useCallback } from 'react';

const PLAYLIST = [
    { src: '/mcmaster/Chris Lake - Savana [Official Visualizer].mp3' },
];

type AudioWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};

export function useAudioParty() {
    const [hasStarted, setHasStarted] = useState(false);
    const [isBeatDrop] = useState(false);
    const [isBeat] = useState(false);
    const [dropStrength] = useState(0);
    const [isMajorDrop] = useState(false);
    const [majorDropStrength] = useState(0);
    const [beatStrength] = useState(0);
    const [buildUpStrength] = useState(0);
    const [dropPulse] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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

        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = PLAYLIST[0].src;
        audio.loop = true;
        audio.volume = 0.8;
        audioRef.current = audio;

        const source = ctx.createMediaElementSource(audio);
        sourceRef.current = source;
        source.connect(ctx.destination);

        audio.play().then(() => {
            setHasStarted(true);
        }).catch((e) => console.error('Playback failed:', e));
    }, [hasStarted]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (contextRef.current) contextRef.current.close();
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
