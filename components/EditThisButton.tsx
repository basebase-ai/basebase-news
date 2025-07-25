'use client';

import { useState, useEffect } from 'react';

export default function EditThisButton() {
  const [editUrl, setEditUrl] = useState<string>('https://editor.basebase.us/');

  useEffect(() => {
    // Get project from environment variable
    const project = process.env.BASEBASE_PROJECT;
    // Get Basebase token from localStorage
    const basebaseToken = localStorage.getItem('basebase_token');
    
    // Build query parameters with project first for readability
    const params = new URLSearchParams();
    
    if (project) {
      params.append('project', project);
    }
    
    params.append('repo', 'https://github.com/grenager/basebase-news');
    
    if (basebaseToken) {
      params.append('token', basebaseToken);
    }
    
    setEditUrl(`https://editor.basebase.us/?${params.toString()}`);
  }, []);

  return (
    <a
      href={editUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium text-sm"
    >
      <span>Edit This</span>
    </a>
  );
} 