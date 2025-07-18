
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchJournalEntries, 
  createJournalEntry, 
  updateJournalEntry, 
  deleteJournalEntry 
} from '@/services/journalService';
import { calculateCurrentStreak, checkForMilestone, sendMilestoneMessage } from '@/services/milestoneService';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export const useJournalEntries = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();

  // Fetch entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journal-entries', userId],
    queryFn: () => {
      console.log('Fetching journal entries for user:', userId);
      return fetchJournalEntries(userId!);
    },
    enabled: !!userId,
    retry: (failureCount, error) => {
      console.error('Journal entries query failed:', error);
      // Only retry 2 times for network errors
      return failureCount < 2;
    }
  });

  // Log the query state for debugging
  console.log('useJournalEntries state:', { 
    userId, 
    entriesCount: entries.length, 
    isLoading, 
    hasError: !!error 
  });

  // Debug: Log actual entries for troubleshooting
  if (entries.length > 0) {
    console.log('Recent entries:', entries.slice(0, 5).map(e => ({
      id: e.id,
      entry_date: e.entry_date,
      source: e.source,
      timestamp: e.timestamp
    })));
  }

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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries', userId] });
      
      // Check for milestone after creating entry
      if (user && profile?.phone_verified && profile?.phone_number) {
        try {
          // Fetch updated entries to calculate new streak
          const updatedEntries = await fetchJournalEntries(userId!);
          const newStreak = calculateCurrentStreak(updatedEntries);
          
          // Check if this is a milestone
          const isMilestone = await checkForMilestone(userId!, newStreak);
          if (isMilestone) {
            await sendMilestoneMessage(userId!, newStreak, profile.phone_number);
          }
        } catch (error) {
          console.error('Error checking/sending milestone message:', error);
          // Don't show error to user for milestone messaging failure
        }
      }
      
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
