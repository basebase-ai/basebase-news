'use client';

import { useState, useEffect } from 'react';
import { Source } from '@/types';
import { useAppState } from '@/lib/state/AppContext';
import LoadingSpinner from './LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCog } from '@fortawesome/free-solid-svg-icons';
import SourceSettings from './SourceSettings';

export default function AllSources() {
  const { currentUser, setCurrentUser, currentSources, setCurrentSources } = useAppState();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceListVersion, setSourceListVersion] = useState(0);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/sources');
        if (response.ok) {
          const data = await response.json();
          const sourcesArray = Array.isArray(data) ? data : [];
          setSources(sourcesArray);
        } else {
          throw new Error(`Failed to fetch sources: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        setError('Failed to load sources');
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, [sourceListVersion]);

  const handleAddSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.includes(sourceId)
        ? currentUser.sourceIds
        : [sourceId, ...currentUser.sourceIds];

      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedSourceIds }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        
        const sourceResponse = await fetch(`/api/sources/${sourceId}`);
        if (sourceResponse.ok) {
          const { source } = await sourceResponse.json();
          if (source && !currentSources?.some(s => s._id === source._id)) {
            setCurrentSources(prev => [...(prev || []), source]);
          }
        }
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.filter(id => id !== sourceId);

      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: updatedSourceIds }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        setCurrentSources(prev => prev.filter(s => s._id !== sourceId));
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const isSourceAdded = (sourceId: string): boolean => {
    return currentUser?.sourceIds.includes(sourceId) || false;
  };

  const handleEditSource = (source: Source | null) => {
    setEditingSource(source);
    setSourceSettingsOpen(true);
  };

  const handleSourceSave = () => {
    setSourceListVersion(v => v + 1);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Sources</h2>
        <button
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          onClick={() => handleEditSource(null)}
        >
          <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
          <span>Create New Source</span>
        </button>
      </div>

      {loading && <LoadingSpinner message="Loading sources..." />}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}
      
      {!loading && !error && (
        <div className="space-y-2">
          {sources.map(source => (
            <div key={source._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {source.imageUrl && <img src={source.imageUrl} alt={source.name} className="w-8 h-8 object-contain" />}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{source.homepageUrl}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {currentUser?.isAdmin && (
                  <button onClick={() => handleEditSource(source)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
                  </button>
                )}
                {isSourceAdded(source._id) ? (
                  <button onClick={() => handleRemoveSource(source._id)} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700">
                    Remove
                  </button>
                ) : (
                  <button onClick={() => handleAddSource(source._id)} className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700">
                    Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SourceSettings
        isOpen={sourceSettingsOpen}
        onClose={() => {
          setSourceSettingsOpen(false);
          setEditingSource(null);
        }}
        editingSource={editingSource}
        onSourceSave={handleSourceSave}
      />
    </>
  );
} 