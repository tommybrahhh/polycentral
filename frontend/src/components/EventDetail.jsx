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
import { CountdownTimer } from './EventCard'; // Assuming CountdownTimer is exported from EventCard or moved to its own file.
import PredictionModal from './PredictionModal';
import SuccessAnimation from './SuccessAnimation';
import Snackbar from './Snackbar';

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState(100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setEvent(null);
      setError(null);
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

  const potentialReward = selectedPrediction ? (selectedEntryFee * (selectedPrediction.multiplier || 2.5)).toFixed(2) : '0.00';

  const handlePredictionSelect = (prediction) => {
    // If user clicks the same prediction, deselect it. Otherwise, select the new one.
    if (selectedPrediction && selectedPrediction.value === prediction.value) {
        setSelectedPrediction(null);
    } else {
        setSelectedPrediction(prediction);
        setIsModalOpen(true);
    }
  };

  const handleSubmitPrediction = async (stake) => {
    setIsModalOpen(false);
    // Here you would call your API
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) throw new Error('User not authenticated');
      
      // Validate entry fee structure
      if (typeof stake !== 'number' || stake < 100) {
        throw new Error('Invalid entry fee configuration');
      }
      
      // Check if user has enough points for the bet
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

      // Trigger success flow
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSnackbarMessage(`Bet for ${stake} PTS placed!`);
        setTimeout(() => setSnackbarMessage(''), 3000);
        
        // Update user points and refresh data
        const updatedUserData = {
          ...userData,
          points: userData.points - stake,
          lastBet: {
            eventId: event.id,
            amount: stake,
            timestamp: new Date().toISOString()
          }
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: updatedUserData.points }));
        window.dispatchEvent(new CustomEvent('refreshEvents'));
        
      }, 1500); // Match the animation duration

    } catch (error) {
      console.error('Submission failed', error);
      setSnackbarMessage('Prediction failed. Please try again.');
      setTimeout(() => setSnackbarMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="card space-y-6 sm:space-y-8">
        {/* Section 1: Event Header & Urgency */}
        <div className="text-center">
          <h2 className="text-3xl font-bold">{event.title}</h2>
          {event.end_time && (
            <div className="mt-md inline-block">
                <CountdownTimer endTime={event.end_time} />
            </div>
          )}
        </div>

        {/* Section 2: Hero Stats, Ticker, and Trend Charts */}
        <div className="space-y-md">
          <EventHeroStats
              prizePool={event.prize_pool}
              participants={event.current_participants}
          />
          <LiveActivityTicker participants={event.current_participants} />
          
          {/* Enhanced Outcome Trend Visualization */}
          <OutcomeTrendChart
            eventId={event.id}
            options={event.options}
          />
          
          {/* Original Participation Trend Chart */}
          <ParticipationTrendChart eventId={event.id} />
        </div>
        
        {/* Section 3: The Arena - Outcome Visualizer */}
        <div className="bg-surface p-lg rounded-md">
            <h3 className="text-center text-xl font-semibold mb-lg">Choose an Outcome</h3>
            <OutcomeVisualizer 
                options={event.options}
                optionVolumes={event.option_volumes}
                totalPool={event.prize_pool}
                onSelectPrediction={handlePredictionSelect}
                selectedPredictionValue={selectedPrediction?.value}
            />
        </div>

        {/* Section 4: Your Bet (Conditionally Rendered) */}
        {selectedPrediction && (
            <div className="bg-surface p-lg rounded-md border-2 border-orange-primary">
                <h3 className="text-center text-xl font-semibold mb-md">Your Selection</h3>
                <div className="text-center bg-charcoal p-md rounded-md mb-lg">
                    <div className="text-secondary">Your Potential Reward</div>
                    <div className="text-success font-bold text-4xl">
                        ${potentialReward}
                    </div>
                    <div className="text-secondary text-sm">
                        for a {selectedEntryFee} PTS entry on <span className="font-bold text-primary">{selectedPrediction.label}</span>
                    </div>
                </div>
            </div>
        )}

        {/* New Prediction Modal */}
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

        {/* Resolution Status */}
        {event.status === 'resolved' && (
          <div className="bg-success bg-opacity-10 p-md rounded-md text-center mt-lg">
            <strong className="text-success">Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;