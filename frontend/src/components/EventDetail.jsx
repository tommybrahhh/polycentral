// src/components/EventDetail.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EventStats from './EventStats';
import OutcomeVisualizer from './OutcomeVisualizer';
import LiveActivityTicker from './LiveActivityTicker';
import OutcomeTrendChart from './OutcomeTrendChart';
import { CountdownTimer } from './EventCard';
import BetSlip from './BetSlip';
import SuccessAnimation from './SuccessAnimation';
import Snackbar from './Snackbar';
import PredictionModal from './PredictionModal';


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
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`, { headers });
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
      const errorMessage = error.response && error.response.data && error.response.data.error
        ? error.response.data.error
        : 'Prediction failed. Please try again.';
      setSnackbarMessage(errorMessage);
      setTimeout(() => setSnackbarMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold">{event.title}</h2>
          {event.end_time && (
            <div className="mt-2 inline-block">
                <CountdownTimer endTime={event.end_time} />
            </div>
          )}
        </div>

        <EventStats
            prizePool={event.prize_pool}
            participants={event.current_participants}
            entryFee={event.entry_fee}
        />

        <div className="bg-surface p-4 rounded-lg">
          <OutcomeTrendChart
            eventId={event.id}
            options={event.options}
          />
        </div>
        
        <div className="bg-surface p-4 rounded-lg">
            <h3 className="text-center text-lg font-semibold mb-4">Choose an Outcome</h3>
            <OutcomeVisualizer 
                options={event.options}
                optionVolumes={event.option_volumes}
                totalPool={event.prize_pool}
                onSelectPrediction={handlePredictionSelect}
                selectedPredictionValue={selectedPrediction?.value}
            />
        </div>

                        <AnimatePresence>
                          {selectedPrediction && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="bg-surface p-4 rounded-lg border-2 border-orange-primary"
                            >
                              <h3 className="text-center text-lg font-semibold mb-4">Place Your Bet</h3>
                              <BetSlip 
                                selectedPrediction={selectedPrediction}
                                currentUserPoints={JSON.parse(localStorage.getItem('user') || '{}').points || 0}
                                onSubmit={handleSubmitPrediction}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>                <PredictionModal
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
          <div className="bg-success bg-opacity-10 p-4 rounded-md text-center mt-6">
            <strong className="text-success">Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;