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
import SourceSettings from './SourceSettings';
import LoadingSpinner from './LoadingSpinner';
import { basebaseService } from '@/services/basebase.service';
import { gql } from 'graphql-request';

const UPDATE_USER_SOURCES = gql`
  mutation UpdateUserSources($id: ID!, $data: JSON!) {
    updateDocument(collection: "users", id: $id, data: $data) {
      id
      data
    }
  }
`;

interface SourceGridProps {
  friendsListOpen: boolean;
}

export default function SourceGrid({ friendsListOpen }: SourceGridProps) {
  const { currentUser, currentSources, setCurrentSources, searchTerm, setCurrentUser, denseMode, setSignInModalOpen } = useAppState();
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
        // Update source order in BaseBase
        await basebaseService.graphql(UPDATE_USER_SOURCES, {
          id: currentUser._id,
          data: { sourceIds: newSourceIds }
        });
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
      await basebaseService.graphql(UPDATE_USER_SOURCES, {
        id: currentUser._id,
        data: { sourceIds: updatedSourceIds }
      });
      
      // Update local state
      setCurrentUser({
        ...currentUser,
        sourceIds: updatedSourceIds
      });
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
      prev.map(s => s._id === updatedSource._id ? updatedSource : s)
    );
  }, [setCurrentSources]);

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
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentUser.sourceIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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