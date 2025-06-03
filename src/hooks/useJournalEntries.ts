
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Entry } from '@/types/entry';
import { useToast } from '@/hooks/use-toast';

export const useJournalEntries = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journal-entries', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select(`
            *,
            journal_photos (
              id,
              file_path,
              file_name
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data to match Entry interface
        return data.map((entry): Entry => ({
          id: entry.id,
          content: entry.content,
          title: entry.title,
          source: entry.source as 'web' | 'sms',
          timestamp: new Date(entry.created_at),
          entry_date: entry.entry_date,
          user_id: entry.user_id,
          tags: entry.tags || [],
          photos: entry.journal_photos?.map((photo: any) => {
            const { data: publicUrl } = supabase.storage
              .from('journal-photos')
              .getPublicUrl(photo.file_path);
            return publicUrl.publicUrl;
          }) || []
        }));
      } catch (error) {
        console.error('Error fetching entries:', error);
        throw error;
      }
    },
    enabled: !!userId
  });

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async ({ content, title, tags = [], photos = [] }: {
      content: string;
      title: string;
      tags?: string[];
      photos?: File[];
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // Input validation
      if (!content.trim()) {
        throw new Error('Content cannot be empty');
      }

      if (content.length > 10000) {
        throw new Error('Content too long (max 10,000 characters)');
      }

      if (photos.length > 10) {
        throw new Error('Too many photos (max 10)');
      }

      // Create the entry
      const entryDate = new Date().toISOString().split('T')[0];
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content: content.trim(),
          title: title.trim(),
          source: 'web',
          entry_date: entryDate,
          tags: tags.filter(tag => tag.trim().length > 0).slice(0, 10)
        })
        .select()
        .single();

      if (error) throw error;

      // Upload photos if any
      if (photos.length > 0) {
        const photoPromises = photos.map(async (photo) => {
          const fileExt = photo.name.split('.').pop()?.toLowerCase();
          if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            throw new Error(`Invalid file type: ${photo.type}`);
          }

          if (photo.size > 10 * 1024 * 1024) {
            throw new Error(`File too large: ${photo.name} (max 10MB)`);
          }

          const fileName = `${userId}/${entry.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('journal-photos')
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          // Save photo record
          const { error: photoError } = await supabase
            .from('journal_photos')
            .insert({
              entry_id: entry.id,
              file_path: fileName,
              file_name: photo.name,
              file_size: photo.size,
              mime_type: photo.type
            });

          if (photoError) throw photoError;

          return fileName;
        });

        await Promise.all(photoPromises);
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries', userId] });
      toast({
        title: "Entry created",
        description: "Your journal entry has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create journal entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      if (!content.trim()) {
        throw new Error('Content cannot be empty');
      }

      if (content.length > 10000) {
        throw new Error('Content too long (max 10,000 characters)');
      }

      const { error } = await supabase
        .from('journal_entries')
        .update({ content: content.trim() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries', userId] });
      toast({
        title: "Entry updated",
        description: "Your journal entry has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update journal entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // First delete associated photos from storage
      const { data: photos } = await supabase
        .from('journal_photos')
        .select('file_path')
        .eq('entry_id', entryId);

      if (photos && photos.length > 0) {
        const filePaths = photos.map(photo => photo.file_path);
        const { error: storageError } = await supabase.storage
          .from('journal-photos')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting photos from storage:', storageError);
        }
      }

      // Delete the entry (photos will be deleted via cascade)
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries', userId] });
      toast({
        title: "Entry deleted",
        description: "Your journal entry has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    entries,
    isLoading,
    error,
    createEntry: createEntryMutation.mutate,
    updateEntry: updateEntryMutation.mutate,
    deleteEntry: deleteEntryMutation.mutate,
    isCreating: createEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending
  };
};
