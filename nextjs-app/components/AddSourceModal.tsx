import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Source } from '@/types';
import { useAppState } from '@/lib/state/AppContext';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddSourceModal({ isOpen, onClose }: AddSourceModalProps) {
  const { currentUser, setCurrentUser } = useAppState();
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
        : [...currentUser.sourceIds, sourceId];
      
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds: updatedSourceIds,
        }),
      });

      if (response.ok) {
        setCurrentUser({
          ...currentUser,
          sourceIds: updatedSourceIds,
        });
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  const isSourceAdded = (sourceId: string): boolean => {
    return currentUser?.sourceIds.includes(sourceId) || false;
  };

  return (
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
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Add Source
                </Dialog.Title>

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
                        <button
                          className={`px-4 py-2 text-sm font-medium rounded-lg ${
                            isSourceAdded(source._id)
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary-dark'
                          }`}
                          onClick={() => handleAddSource(source._id)}
                          disabled={isSourceAdded(source._id)}
                        >
                          {isSourceAdded(source._id) ? 'Added' : 'Add'}
                        </button>
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
  );
} 