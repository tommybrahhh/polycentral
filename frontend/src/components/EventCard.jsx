import React from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeEventOptions } from '../utils/eventUtils';

export const CountdownTimer = ({ endTime }) => {
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
  
      const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
      const totalSeconds = totalMinutes * 60 + newTimeLeft.seconds;
  
      const isCriticalState = totalSeconds <= 60;
      const isWarningState = totalMinutes <= 60 && totalSeconds > 60;
      
      setIsCritical(isCriticalState);
      setIsWarning(isWarningState);
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endTime]);

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

const EventCard = ({ event }) => {
  const navigate = useNavigate();
  
  if (!event) {
    return (
      <div className="card animate-pulse" aria-label="Loading event...">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="flex justify-between mb-4">
          <div className="h-10 bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-700 rounded w-1/3"></div>
        </div>
        <div className="h-12 bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  const eventOptions = React.useMemo(() => normalizeEventOptions(event.options), [event.options]);

  const isEventClosingSoon = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    const timeDiff = endTime - now;
    const oneHour = 60 * 60 * 1000;
    return timeDiff > 0 && timeDiff <= oneHour;
  };

  const isEventExpired = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    return now >= endTime;
  };

  if (isEventExpired(event)) {
    return null;
  }

  return (
    <div
      className="card p-4 sm:p-6 space-y-4"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-primary text-lg sm:text-xl font-semibold leading-tight">{event.title}</h3>
        <div className={`text-sm sm:text-base ${isEventClosingSoon(event) ? 'text-orange font-medium' : 'text-success'}`}>
            {isEventClosingSoon(event) ? 'Closing' : 'Active'}
        </div>
      </div>

      <p className="text-primary text-sm sm:text-base leading-relaxed">{event.description}</p>

      <div className="flex gap-4 sm:gap-6 justify-around">
        <div className="flex flex-col items-center">
          <span className="text-secondary text-xs sm:text-sm mb-1">Prize Pool</span>
          <span className="text-primary font-semibold text-sm sm:text-base">💰 ${event.prize_pool?.toLocaleString() || 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-secondary text-xs sm:text-sm mb-1">Participants</span>
          <span className="text-primary font-semibold text-sm sm:text-base">👥{event.current_participants}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-secondary text-xs sm:text-sm mb-1">Entry Fee</span>
          <span className="text-primary font-semibold text-sm sm:text-base">🎫 {typeof event.entry_fee === 'number' ? `${event.entry_fee} PTS` : 'N/A'}</span>
        </div>
      </div>

      {event.prediction_distribution && (event.prediction_distribution.up > 0 || event.prediction_distribution.down > 0) && (
        <div className="mb-sm">
          <div className="flex justify-between text-xs text-secondary mb-1 px-1">
            <span className="text-success font-semibold">
              Bullish: {event.prediction_distribution.up.toFixed(0)}%
            </span>
            <span className="text-danger font-semibold">
              Bearish: {event.prediction_distribution.down.toFixed(0)}%
            </span>
          </div>
          <div className="sentiment-bar">
            <div
              className="sentiment-fill higher"
              style={{ width: `${event.prediction_distribution.up}%` }}
              title={`${event.prediction_distribution.up.toFixed(1)}% Bullish`}
            ></div>
            <div
              className="sentiment-fill lower"
              style={{ width: `${event.prediction_distribution.down}%` }}
              title={`${event.prediction_distribution.down.toFixed(1)}% Bearish`}
            ></div>
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <button className="btn btn-primary w-full sm:w-auto px-6 py-3 text-base" onClick={(e) => {
          e.stopPropagation();
          navigate(`/events/${event.id}`);
        }}>
          View & Place Bet
        </button>
      </div>
    </div>
  );
};

export default EventCard;