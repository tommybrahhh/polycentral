// src/components/EventDetail.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Participation from './Participation';
import EventHeroStats from './EventHeroStats';
import OutcomeVisualizer from './OutcomeVisualizer';
import LiveActivityTicker from './LiveActivityTicker';
import ParticipationTrendChart from './ParticipationTrendChart';
import { CountdownTimer } from './EventCard'; // Assuming CountdownTimer is exported from EventCard or moved to its own file.

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState(100);

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
    }
  };

  return (
    <div className="p-lg max-w-4xl mx-auto">
      <div className="card space-y-xl">
        {/* Section 1: Event Header & Urgency */}
        <div className="text-center">
          <h2 className="text-3xl font-bold">{event.title}</h2>
          {event.end_time && (
            <div className="mt-md inline-block">
                <CountdownTimer endTime={event.end_time} />
            </div>
          )}
        </div>

        {/* Section 2: Hero Stats, Ticker, and NEW Trend Chart */}
        <div className="space-y-md">
          <EventHeroStats
              prizePool={event.prize_pool}
              participants={event.current_participants}
          />
          <LiveActivityTicker participants={event.current_participants} />
          {/* INSERT THE NEW COMPONENT HERE */}
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
                <h3 className="text-center text-xl font-semibold mb-md">Confirm Your Prediction</h3>
                <div className="text-center bg-charcoal p-md rounded-md mb-lg">
                    <div className="text-secondary">Your Potential Reward</div>
                    <div className="text-success font-bold text-4xl">
                        ${potentialReward}
                    </div>
                    <div className="text-secondary text-sm">
                        for a {selectedEntryFee} PTS entry on <span className="font-bold text-primary">{selectedPrediction.label}</span>
                    </div>
                </div>

                <Participation
                    event={event}
                    selectedPrediction={selectedPrediction}
                    selectedEntryFee={selectedEntryFee}
                    setSelectedEntryFee={setSelectedEntryFee}
                />
            </div>
        )}

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