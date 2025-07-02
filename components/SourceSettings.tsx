'use client';

import React from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { Source } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { sourceService, ISource } from '@/services/source.service';

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

    let rssUrl = (formData.get('rssUrl') as string) || undefined;
    if (rssUrl && !/^https?:\/\//i.test(rssUrl)) {
      rssUrl = `https://${rssUrl}`;
    }

    let imageUrl = (formData.get('imageUrl') as string) || undefined;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      imageUrl = `https://${imageUrl}`;
    }

    const sourceData: ISource = {
      name: formData.get('name') as string,
      homepageUrl: homepageUrl,
      rssUrl: rssUrl,
      metadata: JSON.stringify({ imageUrl })
    };

    try {
      if (editingSource) {
        await sourceService.updateSource(editingSource._id, sourceData);
        const updatedSource = await sourceService.getSource(editingSource._id);
        
        // Transform source to match UI format
        const transformedSource = {
          _id: updatedSource.id || '',
          name: updatedSource.name,
          homepageUrl: updatedSource.homepageUrl || '',
          rssUrl: updatedSource.rssUrl,
          imageUrl: imageUrl,
          lastScrapedAt: updatedSource.lastScrapedAt
        };

        setCurrentSources((prev: Source[]) => 
          prev.map((s: Source) => s._id === editingSource._id ? transformedSource : s)
        );
      } else {
        await sourceService.addSource(sourceData);
        const sources = await sourceService.getSources();
        const newSource = sources.find(s => s.name === sourceData.name);
        
        if (newSource) {
          // Transform source to match UI format
          const transformedSource = {
            _id: newSource.id || '',
            name: newSource.name,
            homepageUrl: newSource.homepageUrl || '',
            rssUrl: newSource.rssUrl,
            imageUrl: imageUrl,
            lastScrapedAt: newSource.lastScrapedAt
          };

          setCurrentSources((prev: Source[]) => [...prev, transformedSource]);
        }
      }

      setToast({ message: 'Source saved successfully!', type: 'success' });
      onSourceSave();
      onClose();
    } catch (error) {
      console.error('Failed to save source:', error);
      setToast({ message: error instanceof Error ? error.message : 'An unexpected error occurred.', type: 'error' });
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
              Image URL (optional)
            </label>
            <input
              type="text"
              name="imageUrl"
              defaultValue={editingSource?.imageUrl}
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