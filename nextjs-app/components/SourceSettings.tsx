'use client';

import React from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { Source } from '@/types';

interface SourceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  editingSource: Source | null;
}

export default function SourceSettings({ isOpen, onClose, editingSource }: SourceSettingsProps) {
  const { currentUser, currentSources, setCurrentSources } = useAppState();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const sourceData = {
      name: formData.get('name'),
      homepageUrl: formData.get('homepageUrl'),
      rssUrl: formData.get('rssUrl'),
      includeSelector: formData.get('includeSelector'),
      excludeSelector: formData.get('excludeSelector'),
      biasScore: formData.get('biasScore'),
    };

    try {
      const response = await fetch(
        editingSource ? `/api/sources/${editingSource._id}` : '/api/sources',
        {
          method: editingSource ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sourceData),
        }
      );

      if (response.ok) {
        const { source: updatedSource } = await response.json();
        setCurrentSources((prev: Source[]) => 
          editingSource 
            ? prev.map((s: Source) => s._id === editingSource._id ? updatedSource : s)
            : [...prev, updatedSource]
        );
        onClose();
      }
    } catch (error) {
      console.error('Failed to save source:', error);
    }
  };

  if (!currentUser?.isAdmin) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingSource ? 'Edit Source' : 'Add New Source'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={editingSource?.name}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Homepage URL
            </label>
            <input
              type="url"
              name="homepageUrl"
              required
              defaultValue={editingSource?.homepageUrl}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              RSS URL (optional)
            </label>
            <input
              type="url"
              name="rssUrl"
              defaultValue={editingSource?.rssUrl}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Include Selector (optional)
            </label>
            <input
              type="text"
              name="includeSelector"
              defaultValue={editingSource?.includeSelector}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exclude Selector (optional)
            </label>
            <input
              type="text"
              name="excludeSelector"
              defaultValue={editingSource?.excludeSelector}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bias Score (optional)
            </label>
            <input
              type="number"
              name="biasScore"
              min="-10"
              max="10"
              step="0.1"
              defaultValue={editingSource?.biasScore}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingSource ? 'Save Changes' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 