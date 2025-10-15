import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Participation from './Participation';
import ActivityMeter from './ActivityMeter';

// Helper function to safely format price range values
const formatPriceRangeValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const numValue = Number(value);
  return isNaN(numValue) ? 'N/A' : numValue.toFixed(2);
};

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntryFee, setSelectedEntryFee] = useState(100);

  useEffect(() => {
    const fetchEvent = async () => {
      // FIX: Reset state to show loading indicator and clear old data
      setLoading(true);
      setEvent(null);
      setError(null);

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`);
        const eventData = response.data;
        
        // Ensure numeric values are properly converted from strings
        if (eventData) {
          eventData.initial_price = Number(eventData.initial_price) || 0;
          eventData.final_price = Number(eventData.final_price) || 0;
          eventData.current_price = Number(eventData.current_price) || 0;
          eventData.prize_pool = Number(eventData.prize_pool) || 0;
        }
        
        setEvent(eventData);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to load event');
      } finally {
        // This will run after the try or catch block completes
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) return <div className="loading">Loading event...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!event) return <div className="form-error">Event not found</div>;

  return (
    <div className="p-lg">
      {/* Main card container */}
      <div className="card">
        <div className="text-center mb-lg">
          <h2>{event.title}</h2>
          <p className="text-secondary">{event.description}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">

          {/* --- LEFT COLUMN: Information & Context --- */}
          <div className="space-y-lg">
            <h3 className="text-center">Event Data</h3>

            {/* Price Display */}
            <div className="flex gap-lg justify-center">
              <div className="text-center">
                <div className="text-secondary">Current Price</div>
                <div className="text-primary font-bold text-xl">${event.current_price?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="text-center">
                <div className="text-secondary">Initial Price</div>
                <div className="text-primary font-bold text-xl">${event.initial_price?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
            
            {/* --- NEW: Event Activity Meter --- */}
            <ActivityMeter
                prizePool={event.prize_pool}
                participants={event.current_participants}
            />

            {/* Community Sentiment Pool */}
            {(event.up_bet_percentage || event.down_bet_percentage) && (
              <div className="bg-surface p-md rounded-md">
                <h3 className="text-center mb-md">Community Sentiment</h3>
                <div className="space-y-md">
                  <div>
                    <div className="flex justify-between text-sm mb-sm">
                      <span className="text-success">Bullish</span>
                      <span className="text-primary">{(event.up_bet_percentage ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="sentiment-bar">
                      <div className="sentiment-fill higher" style={{ width: `${event.up_bet_percentage ?? 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-sm">
                      <span className="text-danger">Bearish</span>
                      <span className="text-primary">{(event.down_bet_percentage ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="sentiment-bar">
                      <div className="sentiment-fill lower" style={{ width: `${event.down_bet_percentage ?? 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price Ranges / Possible Outcomes */}
            {event.initial_price && event.price_ranges && (
              <div className="bg-surface p-md rounded-md">
                <h3 className="text-center mb-md">Possible Outcomes</h3>
                <div className="grid grid-cols-2 gap-sm">
                  {/* UP Ranges */}
                  <div className="text-center p-sm border border-success rounded-sm">
                    <div className="text-success font-semibold">0-3% Up</div>
                    <div className="text-secondary text-sm">${formatPriceRangeValue(event.initial_price)} - ${formatPriceRangeValue(event.price_ranges?.['0-3% up']?.max)}</div>
                  </div>
                  <div className="text-center p-sm border border-success rounded-sm">
                    <div className="text-success font-semibold">3-5% Up</div>
                    <div className="text-secondary text-sm">${formatPriceRangeValue(event.price_ranges?.['0-3% up']?.max)} - ${formatPriceRangeValue(event.price_ranges?.['3-5% up']?.max)}</div>
                  </div>
                  <div className="text-center p-sm border border-success rounded-sm">
                    <div className="text-success font-semibold">5%+ Up</div>
                    <div className="text-secondary text-sm">${formatPriceRangeValue(event.price_ranges?.['3-5% up']?.max)}+</div>
                  </div>
                  {/* DOWN Ranges */}
                  <div className="text-center p-sm border border-danger rounded-sm">
                    <div className="text-danger font-semibold">0-3% Down</div>
                    <div className="text-secondary text-sm">${formatPriceRangeValue(event.price_ranges?.['0-3% down']?.min)} - ${formatPriceRangeValue(event.initial_price)}</div>
                  </div>
                  <div className="text-center p-sm border border-danger rounded-sm">
                    <div className="text-danger font-semibold">3-5% Down</div>
                    <div className="text-secondary text-sm">${formatPriceRangeValue(event.price_ranges?.['3-5% down']?.min)} - ${formatPriceRangeValue(event.price_ranges?.['0-3% down']?.min)}</div>
                  </div>
                  <div className="text-center p-sm border border-danger rounded-sm">
                    <div className="text-danger font-semibold">5%+ Down</div>
                    <div className="text-secondary text-sm">{"<"} ${formatPriceRangeValue(event.price_ranges?.['3-5% down']?.min)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: Betting Actions --- */}
          <div className="bg-surface p-lg rounded-md">
            <h3 className="text-center mb-lg">Place Your Bet</h3>
            
            {/* Dynamic Rewards Display */}
            <div className="text-center bg-charcoal p-md rounded-md mb-lg">
              <div className="text-secondary">Potential Reward</div>
              <div className="text-primary font-bold text-2xl">
                ${(selectedEntryFee * (event.prize_pool / 100)).toFixed(2)}
              </div>
              <div className="text-secondary text-sm">
                Based on {selectedEntryFee} PTS entry
              </div>
            </div>

            {/* The Participation component is now nested here */}
            <Participation
              event={event}
              selectedEntryFee={selectedEntryFee}
              setSelectedEntryFee={setSelectedEntryFee}
            />
          </div>
        </div>

        {/* Resolution Status (if applicable) */}
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