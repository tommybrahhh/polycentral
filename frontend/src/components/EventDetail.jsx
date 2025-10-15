import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Participation from './Participation';
import ParticipationChart from './ParticipationChart';

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
    <div className="event-detail-container">
      {/* Main card container for the new layout */}
      <div className="card event-detail-card">
        <div className="event-detail-header">
          <h2 className="event-title">{event.title}</h2>
          <p className="description">{event.description}</p>
        </div>

        {/* New two-column layout */}
        <div className="event-detail-layout">

          {/* --- LEFT COLUMN: Information & Context --- */}
          <div className="info-column">
            <h3 className="column-title">Event Data</h3>

            {/* Price Display */}
            <div className="price-display">
              <div className="price-column">
                <div className="price-label">Current Price</div>
                <div className="price-value">${event.current_price?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="price-column">
                <div className="price-label">Initial Price</div>
                <div className="price-value">${event.initial_price?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
            
            {/* Participation Trend Chart */}
            <div className="betting-section">
              <h3 className="column-title">Prize Pool Growth</h3>
              <div className="chart-container">
                <ParticipationChart
                  eventId={id}
                  style={{ height: '400px', width: '100%' }}
                />
              </div>
            </div>

            {/* Community Sentiment Pool */}
            {(event.up_bet_percentage || event.down_bet_percentage) && (
              <div className="sentiment-pool">
                <h3 className="column-title">Community Sentiment</h3>
                <div className="sentiment-bars">
                  <div className="sentiment-bar up">
                    <div className="sentiment-label">Bullish</div>
                    <div className="sentiment-percentage">
                      {(event.up_bet_percentage ?? 0).toFixed(1)}%
                    </div>
                    <div
                      className="sentiment-progress"
                      style={{ width: `${event.up_bet_percentage ?? 0}%` }}
                    />
                  </div>
                  <div className="sentiment-bar down">
                    <div className="sentiment-label">Bearish</div>
                    <div className="sentiment-percentage">
                      {(event.down_bet_percentage ?? 0).toFixed(1)}%
                    </div>
                    <div
                      className="sentiment-progress"
                      style={{ width: `${event.down_bet_percentage ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Price Ranges / Possible Outcomes */}
            {event.initial_price && event.price_ranges && (
              <div className="price-ranges-display">
                <h3 className="price-ranges-title">Possible Outcomes</h3>
                <div className="price-ranges-grid">
                  {/* UP Ranges */}
                  <div className="price-range-item up">
                   <div className="range-label">0-3% Up</div>
                   <div className="range-value">${formatPriceRangeValue(event.initial_price)} - ${formatPriceRangeValue(event.price_ranges?.['0-3% up']?.max)}</div>
                 </div>
                 <div className="price-range-item up">
                   <div className="range-label">3-5% Up</div>
                   <div className="range-value">${formatPriceRangeValue(event.price_ranges?.['0-3% up']?.max)} - ${formatPriceRangeValue(event.price_ranges?.['3-5% up']?.max)}</div>
                 </div>
                 <div className="price-range-item up">
                   <div className="range-label">5%+ Up</div>
                   <div className="range-value">${formatPriceRangeValue(event.price_ranges?.['3-5% up']?.max)}+</div>
                 </div>
                 {/* DOWN Ranges */}
                 <div className="price-range-item down">
                   <div className="range-label">0-3% Down</div>
                   <div className="range-value">${formatPriceRangeValue(event.price_ranges?.['0-3% down']?.min)} - ${formatPriceRangeValue(event.initial_price)}</div>
                 </div>
                 <div className="price-range-item down">
                   <div className="range-label">3-5% Down</div>
                   <div className="range-value">${formatPriceRangeValue(event.price_ranges?.['3-5% down']?.min)} - ${formatPriceRangeValue(event.price_ranges?.['0-3% down']?.min)}</div>
                 </div>
                 <div className="price-range-item down">
                   <div className="range-label">5%+ Down</div>
                   <div className="range-value">{"<"} ${formatPriceRangeValue(event.price_ranges?.['3-5% down']?.min)}</div>
                 </div>
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: Betting Actions --- */}
          <div className="action-column">
            <h3 className="column-title">Place Your Bet</h3>
            
            {/* Dynamic Rewards Display */}
            <div className="rewards-container">
              <h4 className="rewards-title">Potential Reward</h4>
              <div className="reward-value">
                ${(selectedEntryFee * (event.prize_pool / 100)).toFixed(2)}
              </div>
              <div className="reward-note">
                Based on {selectedEntryFee} SATS entry
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
          <div className="resolution-info">
            <strong>Result:</strong> {event.correct_answer} -
            Final Price: ${event.final_price?.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;