// src/components/EventDetail.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EventHeroStats from './EventHeroStats';
import OutcomeVisualizer from './OutcomeVisualizer';
import LiveActivityTicker from './LiveActivityTicker';
import ParticipationTrendChart from './ParticipationTrendChart';
import OutcomeTrendChart from './OutcomeTrendChart';
import { CountdownTimer } from './EventCard';
import PredictionModal from './PredictionModal';
import SuccessAnimation from './SuccessAnimation';
import Snackbar from './Snackbar';

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`);
        setEvent(response.data);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  if (loading) return <div className="loading">Loading event...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!event) return <div className="form-error">Event not found</div>;

  const handlePredictionSelect = (prediction) => {
    if (selectedPrediction && selectedPrediction.value === prediction.value) {
      setSelectedPrediction(null);
    } else {
      setSelectedPrediction(prediction);
      setIsModalOpen(true);
    }
  };

  const handleSubmitPrediction = async (stake) => {
    setIsModalOpen(false);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) throw new Error('User not authenticated');
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserPoints = userData.points || 0;
      
      if (stake > currentUserPoints) {
        setSnackbarMessage(`Insufficient points. You need ${stake - currentUserPoints} more points.`);
        setTimeout(() => setSnackbarMessage(''), 3000);
        return;
      }

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${event.id}/bet`,
        {
          prediction: selectedPrediction.value,
          entryFee: stake,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSnackbarMessage(`Bet for ${stake} PTS placed!`);
        setTimeout(() => setSnackbarMessage(''), 3000);
        
        const updatedUserData = {
          ...userData,
          points: userData.points - stake,
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: updatedUserData.points }));
        window.dispatchEvent(new CustomEvent('refreshEvents'));
        
      }, 1500);

    } catch (error) {
      console.error('Submission failed', error);
      setSnackbarMessage('Prediction failed. Please try again.');
      setTimeout(() => setSnackbarMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">{event.title}</h2>
          {event.end_time && (
            <div className="mt-4 inline-block">
                <CountdownTimer endTime={event.end_time} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <EventHeroStats
              prizePool={event.prize_pool}
              participants={event.current_participants}
          />
          <LiveActivityTicker participants={event.current_participants} />
          
          <OutcomeTrendChart
            eventId={event.id}
            options={event.options}
          />
          
          <ParticipationTrendChart eventId={event.id} />
        </div>
        
        <div className="bg-surface p-4 sm:p-6 rounded-lg">
            <h3 className="text-center text-xl font-semibold mb-6">Choose an Outcome</h3>
            <OutcomeVisualizer 
                options={event.options}
                optionVolumes={event.option_volumes}
                totalPool={event.prize_pool}
                onSelectPrediction={handlePredictionSelect}
                selectedPredictionValue={selectedPrediction?.value}
            />
        </div>

        <PredictionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedPrediction={selectedPrediction}
          event={event}
          currentUserPoints={JSON.parse(localStorage.getItem('user') || '{}').points || 0}
          onSubmit={handleSubmitPrediction}
        />

        {showSuccess && <SuccessAnimation />}

        <AnimatePresence>
          {snackbarMessage && <Snackbar message={snackbarMessage} />}
        </AnimatePresence>

        {event.status === 'resolved' && (
          <div className="bg-success bg-opacity-10 p-4 rounded-md text-center mt-8">
            <strong className="text-success">Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;