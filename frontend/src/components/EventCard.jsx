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
        
        {/* Key Event Stats Bar */}
        <div className="event-stats">
          <div className="stat-item">
            <span className="stat-label">Prize Pool</span>
            <span className="stat-value">💰 ${event.prize_pool?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Entry Fee</span>
            <span className="stat-value">🎫 {typeof event.entry_fee === 'number' ? `${event.entry_fee} PTS` : 'N/A'}</span>
          </div>
        </div>
        
        {/* Interactive Prediction Options Preview */}
        <div className="prediction-options-preview">
          <h4 className="options-preview-title">Prediction Options</h4>
          {event.options && typeof event.options === 'string' ? (
            <div className="options-grid">
              {(() => {
                try {
                  const options = JSON.parse(event.options);
                  return options.map((option, index) => (
                    <div key={index} className={`action-button option-chip ${option.value.includes('up') ? 'option-chip-up' : 'option-chip-down'}`}>
                      {option.label}
                    </div>
                  ));
                } catch (e) {
                  console.error('Failed to parse event options:', e);
                  return <div className="text-sm text-gray-400">Options not available</div>;
                }
              })()}
            </div>
          ) : (
             <div className="options-grid">
                <div className="option-chip option-chip-up">0-3% Up</div>
                <div className="option-chip option-chip-up">3-5% Up</div>
                <div className="option-chip option-chip-up">5%+ Up</div>
                <div className="option-chip option-chip-down">0-3% Down</div>
                <div className="option-chip option-chip-down">3-5% Down</div>
                <div className="option-chip option-chip-down">5%+ Down</div>
             </div>
          )}
        </div>
        
        {/* Call to Action Button */}
        <div className="card-action-footer">
          <button className="button button-primary" onClick={(e) => {
            e.stopPropagation(); // Prevent card's onClick from firing twice
            navigate(`/events/${event.id}`);
          }}>
            View & Place Bet
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;