import React from 'react';
import { useNavigate } from 'react-router-dom';

const EventCard = ({ event }) => {
  const navigate = useNavigate();

  // Helper function to determine if an event is closing soon (within 1 hour)
  const isEventClosingSoon = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    const timeDiff = endTime - now; // difference in milliseconds
    const oneHour = 60 * 60 * 1000; // one hour in milliseconds
    return timeDiff > 0 && timeDiff <= oneHour;
  };

  // Helper function to determine if an event is expired
  const isEventExpired = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    return now >= endTime;
  };

  // CountdownTimer component
  const CountdownTimer = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isCritical, setIsCritical] = React.useState(false);
    const [isWarning, setIsWarning] = React.useState(false);

    React.useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date();
        const end = new Date(endTime);
        const difference = end - now;

        if (difference <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds };
      };

      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
    
        // Calculate total time in minutes for warning states
        const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
        const totalSeconds = totalMinutes * 60 + newTimeLeft.seconds;
    
        // Set warning states
        const isCriticalState = totalSeconds <= 60; // 1 minute or less
        const isWarningState = totalMinutes <= 60 && totalSeconds > 60; // 1 hour or less but more than 1 minute
        
        setIsCritical(isCriticalState);
        setIsWarning(isWarningState);
      }, 1000);

      // Initial calculation
      setTimeLeft(calculateTimeLeft());

      return () => clearInterval(timer);
    }, [endTime]);

    const formatTime = (value) => {
      return value.toString().padStart(2, '0');
    };

    const getTimeDisplay = () => {
      const { days, hours, minutes, seconds } = timeLeft;
      
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    const timerClass = `countdown-timer ${isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`;

    return (
      <div className={timerClass}>
        <span className="icon">⏰</span>
        <span className="time-display">{getTimeDisplay()}</span>
      </div>
    );
  };

  // Don't render expired events
  if (isEventExpired(event)) {
    return null;
  }

  return (
    <div
      className="card"
      onClick={() => navigate(`/events/${event.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`Event: ${event.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/events/${event.id}`);
        }
      }}
    >
      <div className="card-header">
        <div className="event-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="event-title">{event.title}</h3>
          <div className="flex items-center gap-4">
            <span className="participants" aria-label={`${event.current_participants} participants`}>👥{event.current_participants}</span>
            <div className={`status-indicator ${isEventClosingSoon(event) ? 'status-closing' : 'status-active'}`}>
              <span className="status-dot"></span>
              {isEventClosingSoon(event) ? 'Closing' : 'Active'}
            </div>
            <CountdownTimer endTime={event.end_time} />
          </div>
        </div>
        <div className="prediction-sentiment-bar mt-2">
          <div className="sentiment-fill higher" style={{ width: '70%' }}></div>
          <div className="sentiment-fill lower" style={{ width: '30%' }}></div>
        </div>
      </div>
      <div className="card-body">
        <p className="description">{event.description}</p>
        <div className="event-details">
          <div className="detail">
            <span className="icon">💰</span>
            Pot: ${event.prize_pool?.toLocaleString() || 0}
          </div>
          <div className="detail flex items-center gap-1">
            <span className="icon">🎫</span>
            <span className="whitespace-nowrap">Entry: {typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'}</span>
          </div>
        </div>
        <div className="potential-rewards">
          <div className="potential-rewards-label">Price Prediction Ranges:</div>
          <div className="price-ranges-preview">
            {event.options && typeof event.options === 'string' ? (
              <div className="price-ranges-preview-content">
                {(() => {
                  try {
                    const options = JSON.parse(event.options);
                    const upRanges = options.filter(opt => opt.value.includes('up'));
                    const downRanges = options.filter(opt => opt.value.includes('down'));
                    
                    return (
                      <>
                        <div className="price-range-group up">
                          <span className="price-range-label">Up</span>
                          {upRanges.map((range, index) => (
                            <span key={index} className="price-range-badge">
                              {range.label}
                            </span>
                          ))}
                        </div>
                        <div className="price-range-group down">
                          <span className="price-range-label">Down</span>
                          {downRanges.map((range, index) => (
                            <span key={index} className="price-range-badge">
                              {range.label}
                            </span>
                          ))}
                        </div>
                      </>
                    );
                  } catch (e) {
                    console.error('Failed to parse event options:', e);
                    return null;
                  }
                })()}
              </div>
            ) : (
              <div className="price-ranges-preview-content">
                <div className="price-range-group up">
                  <span className="price-range-label">Up</span>
                  <span className="price-range-badge">0-3% Up</span>
                  <span className="price-range-badge">3-5% Up</span>
                  <span className="price-range-badge">5%+ Up</span>
                </div>
                <div className="price-range-group down">
                  <span className="price-range-label">Down</span>
                  <span className="price-range-badge">0-3% Down</span>
                  <span className="price-range-badge">3-5% Down</span>
                  <span className="price-range-badge">5%+ Down</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sparkline-container">
          <svg className="sparkline" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M0,15 L10,12 L20,14 L30,10 L40,12 L50,8 L60,10 L70,6 L80,8 L90,7 L100,9"
                  stroke="var(--orange-primary)"
                  strokeWidth="2"
                  fill="none"
                  filter="drop-shadow(0 0 4px rgba(255, 165, 0, 0.5))" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default EventCard;