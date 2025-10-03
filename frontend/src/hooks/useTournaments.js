import { useState } from 'react';
import axios from 'axios';

export const useTournaments = () => {
  const [loadingStates, setLoadingStates] = useState({
    entry: false,
    pot: false
  });
  const [error, setError] = useState(null);

  const enterTournament = async (tournamentId, points) => {
    setLoadingStates(prev => ({...prev, entry: true}));
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/tournaments/${tournamentId}/entries`,
        { points },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Entry failed');
      throw error;
    } finally {
      setLoadingStates(prev => ({...prev, entry: false}));
    }
  };

  const getPotSize = async (tournamentId) => {
    setLoadingStates(prev => ({...prev, pot: true}));
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/tournaments/${tournamentId}/pot`
      );
      return response.data.pot_size;
    } catch (error) {
      setError('Failed to fetch pot size');
      throw error;
    } finally {
      setLoadingStates(prev => ({...prev, pot: false}));
    }
  };

  return {
    enterTournament,
    getPotSize,
    loadingStates,
    error
  };
};