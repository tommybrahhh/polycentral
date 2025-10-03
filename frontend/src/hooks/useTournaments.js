import { useState } from 'react';
import axios from 'axios';

export const useEvents = () => {
  const [loadingStates, setLoadingStates] = useState({
    entry: false,
    pot: false
  });
  const [error, setError] = useState(null);

  const joinEvent = async (eventId, eventType, points) => {
    setLoadingStates(prev => ({...prev, entry: true}));
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/entries?eventType=${eventType}`,
        { points },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Event join failed');
      throw error;
    } finally {
      setLoadingStates(prev => ({...prev, entry: false}));
    }
  };

  const getEventPot = async (eventId, eventType) => {
    setLoadingStates(prev => ({...prev, pot: true}));
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/pot?eventType=${eventType}`
      );
      return response.data.pot_size;
    } catch (error) {
      setError('Failed to fetch event pot');
      throw error;
    } finally {
      setLoadingStates(prev => ({...prev, pot: false}));
    }
  };

  return {
    joinEvent,
    getEventPot,
    loadingStates,
    error
  };
};