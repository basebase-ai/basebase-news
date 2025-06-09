import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Source, Story } from '@/types';
import { useAppState } from '@/lib/state/AppContext';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  setSourceHeadlines: (updater: (prev: Map<string, Story[]>) => Map<string, Story[]>) => void;
  onEditSource: (source: Source) => void;
}

export default function AddSourceModal({ isOpen, onClose, setSourceHeadlines, onEditSource }: AddSourceModalProps) {
  const { currentUser, setCurrentUser, currentSources, setCurrentSources } = useAppState();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      console.log('Starting to fetch sources...');
      try {
        setLoading(true);
        setError(null);
        console.log('Making request to /api/sources...');
        const response = await fetch('/api/sources');
        console.log('Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          const sourcesArray = Array.isArray(data) ? data : [];
          setSources(sourcesArray);
          console.log('Sources set:', sourcesArray);
        } else {
          const errorText = await response.text();
          console.error('Response not OK:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch sources: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error in fetchSources:', {
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        setError('Failed to load sources');
      } finally {
        setLoading(false);
        console.log('Fetch sources completed');
      }
    };

    if (isOpen) {
      console.log('Modal opened, triggering source fetch');
      fetchSources();
    }
  }, [isOpen]);

  const handleAddSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      const updatedSourceIds = currentUser.sourceIds.includes(sourceId) 
        ? currentUser.sourceIds 
        : [sourceId, ...currentUser.sourceIds];
      
      const response = await fetch('/api/users/me/sources', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds: updatedSourceIds,
        }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setCurrentUser(user);
        
        // Fetch the new source's headlines and update currentSources
        const sourceResponse = await fetch(`/api/sources/${sourceId}`);
        if (sourceResponse.ok) {
          const { source } = await sourceResponse.json();
          if (source) {
            // Update currentSources if the source isn't already there
            if (!currentSources?.some(s => s._id === source._id)) {
              setCurrentSources(prev => [...(prev || []), source]);
            }
            
            if (source.stories) {
              const sortedStories = [...source.stories].sort((a, b) => {
                const dateA = new Date(a.publishDate);
                const dateB = new Date(b.publishDate);
                return dateB.getTime() - dateA.getTime();
              });
              setSourceHeadlines(prev => {
                const newMap = new Map(prev);
                newMap.set(sourceId, sortedStories);
                return newMap;
              });
            }
            // Close the modal after successfully adding the source
            onClose();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds: updatedSourceIds,
        }),
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

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                      Add Source
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="sr-only">Close</span>
                    </button>
                  </div>

                  <button
                    className="mb-6 flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={() => {
                      onClose();
                      // TODO: Open create source modal
                    }}
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create New Source</span>
                  </button>

                  {loading ? (
                    <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                      Loading sources...
                    </div>
                  ) : error ? (
                    <div className="text-center py-4 text-red-500">
                      {error}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sources.map(source => (
                        <div
                          key={source._id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {source.imageUrl ? (
                              <img
                                src={source.imageUrl}
                                alt={source.name}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                  {source.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {source.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {source.homepageUrl}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {currentUser?.isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSource(source);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Cog6ToothIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                                isSourceAdded(source._id)
                                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
                                  : 'bg-primary text-white hover:bg-primary-dark'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                isSourceAdded(source._id) 
                                  ? handleRemoveSource(source._id)
                                  : handleAddSource(source._id);
                              }}
                            >
                              {isSourceAdded(source._id) ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
} 