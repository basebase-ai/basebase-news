'use client';

import { useEffect, useState, useCallback } from 'react';
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
import SourceSettings from '@/components/SourceSettings';
import LoadingSpinner from './LoadingSpinner';

import { isUserAuthenticated } from '@/services/basebase.service';
import { getCurrentUser, subscribeToSource, unsubscribeFromSource, updateUserSources } from '@/services/user.service';


interface SourceGridProps {
  friendsListOpen: boolean;
}

export default function SourceGrid({ friendsListOpen }: SourceGridProps) {
  const { currentUser, currentSources, setCurrentSources, searchTerm, setCurrentUser, denseMode, setSignInModalOpen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [sourceSettingsOpen, setSourceSettingsOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const loadUserData = useCallback(async () => {
    try {
      if (!isUserAuthenticated()) {
        console.warn('[SourceGrid] User not authenticated');
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('[SourceGrid] Error loading user data:', error);
    }
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setIsDragging(false);

    if (active.id !== over?.id && currentUser && over && !isUpdating) {
      const oldIndex = currentUser.sourceIds.indexOf(active.id as string);
      const newIndex = currentUser.sourceIds.indexOf(over.id as string);
      
      // Validate indices
      if (oldIndex === -1 || newIndex === -1) {
        console.warn('Invalid drag operation - source not found in current sources');
        return;
      }
      
      // Store original order for potential revert
      const originalSourceIds = [...currentUser.sourceIds];
      const newSourceIds = arrayMove(currentUser.sourceIds, oldIndex, newIndex);

      // Update UI optimistically
      setCurrentUser({ ...currentUser, sourceIds: newSourceIds });
      setIsUpdating(true);

      try {
        // Update source order via userService directly
        if (isUserAuthenticated()) {
          const success = await updateUserSources(newSourceIds);
          if (!success) {
            throw new Error('Update failed');
          }
          console.log('Source order updated successfully');
        }
      } catch (error) {
        console.error('Failed to save source order:', error);
        // Revert to original order on error
        setCurrentUser({ ...currentUser, sourceIds: originalSourceIds });
      } finally {
        setIsUpdating(false);
      }
    }
  }

  function handleDragStart() {
    if (!isUpdating) {
      setIsDragging(true);
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    if (!currentUser) return;

    try {
      // Remove source using userService directly
      if (isUserAuthenticated()) {
        await unsubscribeFromSource(sourceId);
      }
      
      // Update local state
      const updatedSourceIds = currentUser.sourceIds.filter(id => id !== sourceId);
      setCurrentUser({ ...currentUser, sourceIds: updatedSourceIds });
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

  const handleSourceUpdate = useCallback((updatedSource: Source) => {
    setCurrentSources(prev => 
      prev.map(s => s.id === updatedSource.id ? updatedSource : s)
    );
  }, [setCurrentSources]);

  const handleSourceToggle = async (sourceId: string, isSubscribed: boolean) => {
    try {
      if (!isUserAuthenticated()) {
        console.warn('[SourceGrid] User not authenticated');
        return;
      }

      if (isSubscribed) {
        await unsubscribeFromSource(sourceId);
      } else {
        await subscribeToSource(sourceId);
      }
      
      // Reload user data to get updated subscriptions
      await loadUserData();
    } catch (error) {
      console.error('[SourceGrid] Error toggling source:', error);
    }
  };

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!currentUser) {
    return <LoadingSpinner message="Loading sources..." />;
  }



  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentUser.sourceIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {currentUser.sourceIds.map(sourceId => {
              const source = currentSources?.find(s => s.id === sourceId);

              if (!source) return null;

              return (
                <SortableSourceBox
                  key={sourceId}
                  source={source}
                  denseMode={denseMode}
                  onRemove={handleRemoveSource}
                  onOpenSettings={handleEditSource}
                  onSourceUpdate={handleSourceUpdate}
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