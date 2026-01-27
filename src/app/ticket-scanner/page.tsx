'use client';

import { useState, useRef, useEffect } from 'react';

const SCANNER_PASSWORD = 'flash1234@';

interface CheckInResult {
  success: boolean;
  message: string;
  name?: string;
  email?: string;
  error?: string;
  checked_in_at?: string;
}

export default function TicketScannerPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password === SCANNER_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      setError('Invalid password');
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setLastResult(null);
      
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (!videoRef.current) {
        setError('Video container not found');
        return;
      }

      const html5QrCode = new Html5Qrcode('scanner-container');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          // Successfully scanned
          handleTicketScan(decodedText);
        },
        (errorMessage: string) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera. Make sure you have camera permissions.');
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleTicketScan = async (ticketCode: string) => {
    // Stop scanning temporarily while processing
    await stopScanning();
    
    try {
      setError('');
      setLastResult(null);

      // Call the verify-ticket API route (more secure)
      const response = await fetch('/api/verify-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketCode: ticketCode.trim().toUpperCase(),
          checkedInBy: 'scanner',
        }),
      });

      const result: CheckInResult = await response.json();
      setLastResult(result);

      if (result.success) {
        setScannedCount(prev => prev + 1);
        // Play success sound (optional)
        playSuccessSound();
        
        // Auto-resume scanning after 2 seconds
        setTimeout(() => {
          startScanning();
        }, 2000);
      } else {
        // Play error sound (optional)
        playErrorSound();
        
        // Auto-resume scanning after 3 seconds for errors
        setTimeout(() => {
          startScanning();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error verifying ticket:', err);
      setError(err.message || 'Failed to verify ticket');
      setLastResult({
        success: false,
        message: 'Error verifying ticket',
        error: err.message,
      });
      
      // Auto-resume scanning after error
      setTimeout(() => {
        startScanning();
      }, 3000);
    }
  };

  const playSuccessSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const handleManualEntry = () => {
    const code = prompt('Enter ticket code manually:');
    if (code) {
      handleTicketScan(code);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-center">Ticket Scanner Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full p-3 mb-4 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:border-amber-500 text-white"
            autoFocus
          />
          {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded font-semibold transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Ticket Scanner</h1>
          <p className="text-gray-400">Scan QR codes to check in attendees</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
            >
              Logout
            </button>
            <div className="text-sm text-gray-400">
              Checked in: <span className="text-white font-bold">{scannedCount}</span>
            </div>
          </div>
        </div>

        {/* Scanner Container */}
        <div className="mb-6">
          <div
            id="scanner-container"
            ref={videoRef}
            className="w-full max-w-md mx-auto bg-gray-900 rounded-lg overflow-hidden"
            style={{ minHeight: '300px' }}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {!isScanning ? (
            <button
              onClick={startScanning}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold"
            >
              Start Scanning
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded font-semibold"
            >
              Stop Scanning
            </button>
          )}
          <button
            onClick={handleManualEntry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Manual Entry
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {lastResult && (
          <div
            className={`p-6 rounded-lg border-2 ${
              lastResult.success
                ? 'bg-green-900/30 border-green-600'
                : 'bg-red-900/30 border-red-600'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">
                {lastResult.success ? '✅' : '❌'}
              </div>
              <h2
                className={`text-2xl font-bold mb-2 ${
                  lastResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {lastResult.success ? 'Checked In!' : 'Error'}
              </h2>
              {lastResult.name && (
                <p className="text-xl text-white mb-1">
                  <strong>{lastResult.name}</strong>
                </p>
              )}
              {lastResult.email && (
                <p className="text-gray-400 text-sm mb-2">{lastResult.email}</p>
              )}
              <p className="text-gray-300">{lastResult.message}</p>
              {lastResult.checked_in_at && (
                <p className="text-gray-500 text-xs mt-2">
                  {new Date(lastResult.checked_in_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
