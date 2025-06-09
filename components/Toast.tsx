'use client';

import { useAppState } from '@/lib/state/AppContext';
import { useEffect } from 'react';

export default function Toast() {
  const { toast, setToast } = useAppState();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  if (!toast) return null;

  const bgColor = toast.type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-lg text-white ${bgColor} shadow-lg z-[200]`}>
      <div className="flex items-center">
        <span>{toast.message}</span>
        <button onClick={() => setToast(null)} className="ml-4 text-white">
          &times;
        </button>
      </div>
    </div>
  );
} 