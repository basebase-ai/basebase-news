'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppState } from '@/lib/state/AppContext';
import { Story, Source } from '@/types';
import { SortableSourceBox } from './SourceBox';
import SourceSettings from './SourceSettings';
import LoadingSpinner from './LoadingSpinner';
import { userService } from '@/services/user.service';

interface SourceGridProps {
  friendsListOpen: boolean;
}

export default function SourceGrid({ friendsListOpen }: SourceGridProps) {
  const { currentUser, currentSources, searchTerm, setCurrentUser, denseMode, setSignInModalOpen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id && currentUser && over) {
      const oldIndex = currentUser.sourceIds.indexOf(active.id as string);
      const newIndex = currentUser.sourceIds.indexOf(over.id as string);
      
      const newSourceIds = arrayMove(currentUser.sourceIds, oldIndex, newIndex);

      setCurrentUser({ ...currentUser, sourceIds: newSourceIds });

      try {
        const response = await fetch('/api/users/me/sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceIds: newSourceIds }),
        });

        if (!response.ok) {
          // Revert on failure
          setCurrentUser({ ...currentUser, sourceIds: currentUser.sourceIds });
        }
      } catch (error) {
        console.error('Failed to save source order:', error);
        // Revert on error
        setCurrentUser({ ...currentUser, sourceIds: currentUser.sourceIds });
      }
    }
  }

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
      } else {
        throw new Error('Failed to update user sources');
      }
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setSourceSettingsOpen(true);
  };

  const handleSourceSave = () => {
    setSourceSettingsOpen(false);
    setEditingSource(null);
  };

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-gray-600 dark:text-gray-400">Please sign in to see your sources.</p>
        <button 
          onClick={() => setSignInModalOpen(true)}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentUser.sourceIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            {currentUser.sourceIds.map(sourceId => {
              const source = currentSources?.find(s => s._id === sourceId);

              if (!source) return null;

              return (
                <SortableSourceBox
                  key={sourceId}
                  source={source}
                  denseMode={denseMode}
                  onRemove={handleRemoveSource}
                  onOpenSettings={handleEditSource}
                  searchTerm={searchTerm}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <SourceSettings
        isOpen={sourceSettingsOpen}
        onClose={() => setSourceSettingsOpen(false)}
        editingSource={editingSource}
        onSourceSave={handleSourceSave}
      />
    </div>
  );
} 