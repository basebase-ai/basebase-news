'use client';

import React from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { Source } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { fetchApi } from '@/lib/api';

interface SourceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  editingSource: Source | null;
  onSourceSave: () => void;
}

export default function SourceSettings({ isOpen, onClose, editingSource, onSourceSave }: SourceSettingsProps) {
  const { currentUser, currentSources, setCurrentSources, setToast } = useAppState();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    let homepageUrl = formData.get('homepageUrl') as string;
    if (homepageUrl && !/^https?:\/\//i.test(homepageUrl)) {
      homepageUrl = `https://${homepageUrl}`;
    }

    let rssUrl = (formData.get('rssUrl') as string) || null;
    if (rssUrl && !/^https?:\/\//i.test(rssUrl)) {
      rssUrl = `https://${rssUrl}`;
    }

    const sourceData = {
      name: formData.get('name') as string,
      homepageUrl: homepageUrl,
      rssUrl: rssUrl,
      includeSelector: (formData.get('includeSelector') as string) || null,
      excludeSelector: (formData.get('excludeSelector') as string) || null,
      biasScore: formData.get('biasScore') ? parseFloat(formData.get('biasScore') as string) : null,
    };

    try {
      const response = await fetchApi(
        editingSource ? `/api/sources/${editingSource._id}` : '/api/sources',
        {
          method: editingSource ? 'PUT' : 'POST',
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
        setToast({ message: 'Source saved successfully!', type: 'success' });
        
        onSourceSave();
        onClose();
      } else {
        const { message } = await response.json();
        setToast({ message: `Failed to save source: ${message}`, type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save source:', error);
      setToast({ message: 'An unexpected error occurred.', type: 'error' });
    }
  };
  
  if (editingSource && !currentUser?.isAdmin) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingSource ? 'Edit Source' : 'Create Source'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="h-6 w-6" />
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Homepage URL
            </label>
            <input
              type="text"
              name="homepageUrl"
              required
              defaultValue={editingSource?.homepageUrl}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              RSS URL (optional)
            </label>
            <input
              type="text"
              name="rssUrl"
              defaultValue={editingSource?.rssUrl}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              {editingSource ? 'Save Changes' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 