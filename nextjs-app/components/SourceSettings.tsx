'use client';

import React, { useState } from 'react';
import { useAppState } from '@/lib/state/AppContext';
import type { Source } from '@/types';

export default function SourceSettings() {
  const { currentUser, currentSources, setCurrentSources } = useAppState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

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
        const { source } = await response.json();
        setCurrentSources((prev: Source[]) => 
          editingSource 
            ? prev.map((s: Source) => s._id === source._id ? source : s)
            : [...prev, source]
        );
        setIsModalOpen(false);
        setEditingSource(null);
      }
    } catch (error) {
      console.error('Failed to save source:', error);
    }
  };

  if (!currentUser?.isAdmin) return null;

  return (
    <React.Fragment>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <i className="ri-add-line text-xl"></i>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingSource ? 'Edit Source' : 'Add New Source'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSource(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <i className="ri-close-line text-2xl"></i>
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
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSource(null);
                  }}
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
      )}
    </React.Fragment>
  );
} 