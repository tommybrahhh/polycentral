import React from 'react';
import PropTypes from 'prop-types';

export const PredictionSelector = ({
  event,
  onParticipate,
  loading,
  userPoints
}) => {
  // Initialize entryAmount with event.min_bet or fallback to 100
  const [selectedPrediction, setSelectedPrediction] = React.useState(null);
  const [entryAmount, setEntryAmount] = React.useState(event.min_bet || 100);
  const [validationError, setValidationError] = React.useState('');

  // Validate that event has required pot system fields
  React.useEffect(() => {
    if (!event) {
      setValidationError('Event data is missing');
      return;
    }
    
    // Check if event has pot system fields
    if (event.pot_enabled === undefined && event.min_bet === undefined && event.max_bet === undefined) {
      console.warn('Event is missing pot system fields, using default values');
    }
  }, [event]);

  const handleParticipation = async () => {
    // Validate event data
    if (!event) {
      setValidationError('Event data is missing');
      return;
    }

    if (!selectedPrediction) {
      setValidationError('Please select a prediction');
      return;
    }

    // Check if userPoints is provided
    if (userPoints === undefined || userPoints === null) {
      setValidationError('User points information not available');
      return;
    }

    if (entryAmount > userPoints) {
      setValidationError('Insufficient points');
      return;
    }

    // Use event.min_bet or default to 100
    const minBet = event.min_bet || 100;
    if (entryAmount < minBet) {
      setValidationError(`Minimum bet is ${minBet} points`);
      return;
    }

    // Use event.max_bet or default to 1000
    const maxBet = event.max_bet || 1000;
    if (entryAmount > maxBet) {
      setValidationError(`Maximum bet is ${maxBet} points`);
      return;
    }

    // Validate entry amount is divisible by 25
    if (entryAmount % 25 !== 0) {
      setValidationError('Bet amount must be divisible by 25');
      return;
    }

    onParticipate({
      eventId: event.id,
      prediction: selectedPrediction,
      entryFee: entryAmount
    }).then(() => {
      setValidationError(''); // Clear error on success
    }).catch(error => {
      setValidationError(error.message || 'Participation failed');
    });
  };

  return (
    <div className="prediction-ui space-y-4">
      <div className="flex gap-2 justify-center">
        <button
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            selectedPrediction === 'higher'
              ? 'bg-success-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setSelectedPrediction('higher')}
          disabled={loading}
          aria-label="Predict higher price"
        >
          ▲ Higher
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            selectedPrediction === 'lower'
              ? 'bg-danger-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setSelectedPrediction('lower')}
          disabled={loading}
          aria-label="Predict lower price"
        >
          ▼ Lower
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="number"
            value={entryAmount}
            onChange={(e) => {
              const value = Number(e.target.value);
              setEntryAmount(Math.max(
                event.min_bet || 100,
                Math.min(value, event.max_bet || 1000)
              ));
            }}
            min={event.min_bet || 100}
            max={event.max_bet || 1000}
            step="25"
            className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            disabled={loading}
            aria-label="Entry amount"
          />
          <button
            onClick={handleParticipation}
            className="px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:bg-gray-400 w-full sm:w-auto transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
            disabled={!selectedPrediction || loading}
            aria-describedby="participation-error"
          >
            {loading ? 'Submitting...' : 'Place Bet'}
          </button>
        </div>
        
        {validationError && (
          <div
            id="participation-error"
            role="alert"
            className="text-danger-500 text-sm mt-2 sm:mt-0 animate-pulse"
          >
            {validationError}
          </div>
        )}
      </div>
      <p className="text-gray-500 text-sm mt-2 italic">
        Bet amount: {entryAmount} points (non-refundable)
      </p>
    </div>
  );
};

PredictionSelector.propTypes = {
  event: PropTypes.object.isRequired,
  onParticipate: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  userPoints: PropTypes.number
};