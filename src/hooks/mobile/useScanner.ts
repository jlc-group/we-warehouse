import { useEffect, useRef, useState } from 'react';

interface UseScannerOptions {
    onScan: (code: string) => void;
    minLength?: number;
    maxDelay?: number; // Maximum delay between keystrokes in ms
    preventDefault?: boolean;
}

export const useScanner = ({
    onScan,
    minLength = 3,
    maxDelay = 50,
    preventDefault = false,
}: UseScannerOptions) => {
    // Buffer to store scanned characters
    const buffer = useRef<string>('');
    // Timestamp of the last keystroke
    const lastKeyTime = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeSinceLastKey = currentTime - lastKeyTime.current;

            // If too much time has passed, reset buffer (it's manual typing, not a scanner)
            if (buffer.current.length > 0 && timeSinceLastKey > maxDelay) {
                buffer.current = '';
            }

            lastKeyTime.current = currentTime;

            // Check for Enter key (End of scan)
            if (e.key === 'Enter') {
                if (buffer.current.length >= minLength) {
                    if (preventDefault) {
                        e.preventDefault();
                    }
                    // Scan complete
                    const code = buffer.current;
                    buffer.current = ''; // Clear buffer immediately
                    console.log('🔫 Scanner Input Detected:', code);
                    onScan(code);
                } else {
                    // Too short, probably just pressing Enter manually
                    buffer.current = '';
                }
                return;
            }

            // Ignore special keys (Shift, Ctrl, Alt, etc.)
            if (e.key.length > 1) return;

            // Append character to buffer
            buffer.current += e.key;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan, minLength, maxDelay, preventDefault]);
};
