import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Participation from './Participation';

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`);
        setEvent(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to load event');
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
      <div className="card">
        <div className="card-body">
          <h2 className="event-title">{event.title}</h2>
          
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
          
          {/* Chart Visualization */}
          <div className="chart-container">
            <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M0,30 L20,25 L40,35 L60,20 L80,25 L100,15"
                    stroke="var(--orange-primary)"
                    strokeWidth="3"
                    fill="none"
                    filter="url(#glow)" />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>
          
          {/* Price Ranges Display */}
          {event.initial_price && (
            <div className="price-ranges-display">
              <h3 className="price-ranges-title">Possible Outcomes</h3>
              <div className="price-ranges-grid">
                {event.price_ranges && (
                  <>
                    <div className="price-range-item up">
                      <div className="range-label">0-3% Up</div>
                      <div className="range-value">${event.initial_price?.toFixed(2)} - ${event.price_ranges['0-3% up']?.max?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="price-range-item up">
                      <div className="range-label">3-5% Up</div>
                      <div className="range-value">${event.price_ranges['0-3% up']?.max?.toFixed(2) || 'N/A'} - ${event.price_ranges['3-5% up']?.max?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="price-range-item up">
                      <div className="range-label">5%+ Up</div>
                      <div className="range-value">${event.price_ranges['3-5% up']?.max?.toFixed(2) || 'N/A'}+</div>
                    </div>
                    <div className="price-range-item down">
                      <div className="range-label">0-3% Down</div>
                      <div className="range-value">${event.price_ranges['0-3% down']?.min?.toFixed(2) || 'N/A'} - ${event.initial_price?.toFixed(2)}</div>
                    </div>
                    <div className="price-range-item down">
                      <div className="range-label">3-5% Down</div>
                      <div className="range-value">${event.price_ranges['3-5% down']?.min?.toFixed(2) || 'N/A'} - ${event.price_ranges['0-3% down']?.min?.toFixed(2) || 'N/A'}</div>
                    </div>
                    <div className="price-range-item down">
                      <div className="range-label">5%+ Down</div>
                      <div className="range-value">&lt; ${event.price_ranges['3-5% down']?.min?.toFixed(2) || 'N/A'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Metadata Bar */}
          <div className="metadata-bar">
            <div className="metadata-item">
              <span className="icon">🎫</span>
              <span className="hidden sm:inline">Entry: </span>{typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'}
            </div>
            <div className="metadata-item">
              <span className="icon">💰</span>
              Pot: ${event.prize_pool?.toLocaleString() || 0}
            </div>
          </div>
          
          {/* Event Description */}
          <div className="event-description">
            <p>{event.description}</p>
          </div>
          
          {/* Potential Rewards */}
          <div className="potential-rewards-section">
            <h3 className="potential-rewards-title">Potential Rewards</h3>
            <div className="potential-rewards-explanation">
              Higher entry fees result in proportionally higher rewards when you win.
            </div>
            <div className="potential-rewards-grid">
              {([100, 200, 500, 1000]).map(fee => {
                // Calculate potential reward based on current prize pool
                // If you're the only participant, you get the whole pot plus your bet back
                // If there are other participants, your share depends on the total amount bet by winners
                const potentialReward = event.prize_pool ?
                  Math.floor(fee + (event.prize_pool * (fee / (event.prize_pool + fee)))) :
                  fee * 2;
                return (
                  <div key={fee} className="potential-reward-item">
                    <span className="fee">{fee} points entry</span>
                    <span className="reward">→ Up to {potentialReward.toLocaleString()} points</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Participation Component */}
          <Participation event={event} />
          
          {/* Resolution Status */}
          {event.status === 'resolved' && (
            <div className="resolution-info">
              <strong>Result:</strong> {event.correct_answer} -
              Final Price: ${event.final_price?.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;