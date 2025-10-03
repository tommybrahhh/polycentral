import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const useTournaments = () => {
  const queryClient = useQueryClient();



  const participateInEventMutation = useMutation({
    mutationFn: async ({ eventId, prediction, entryFee }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/participate`,
        { prediction, entry_fee: entryFee },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userBalance']);
      queryClient.invalidateQueries(['activeTournaments']);
    }
  });

  return {
    participateInEvent: participateInEventMutation.mutateAsync,
    isLoading: participateInEventMutation.isLoading,
    error: participateInEventMutation.error
  };
};