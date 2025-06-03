
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchJournalEntries, 
  createJournalEntry, 
  updateJournalEntry, 
  deleteJournalEntry 
} from '@/services/journalService';

export const useJournalEntries = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journal-entries', userId],
    queryFn: () => fetchJournalEntries(userId!),
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
      return createJournalEntry({ content, title, tags, photos, userId: userId! });
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
    mutationFn: async ({ id, content, photos }: { 
      id: string; 
      content: string; 
      photos?: File[];
    }) => {
      return updateJournalEntry({ id, content, photos, userId: userId! });
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
      return deleteJournalEntry(entryId, userId!);
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
