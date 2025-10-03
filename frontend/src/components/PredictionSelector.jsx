import React from 'react';
import PropTypes from 'prop-types';

export const PredictionSelector = ({ 
  event, 
  onParticipate, 
  loading,
  userPoints
}) => {
  const [selectedPrediction, setSelectedPrediction] = React.useState(null);
  const [entryAmount, setEntryAmount] = React.useState(event.entry_fee);
  const [validationError, setValidationError] = React.useState('');

  const handleParticipation = async () => {
    if (!selectedPrediction) {
      setValidationError('Please select a prediction');
      return;
    }
    if (entryAmount > userPoints) {
      setValidationError('Insufficient points');
      return;
    }
    if (entryAmount < event.entry_fee) {
      setValidationError(`Minimum entry is ${event.entry_fee} points`);
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
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPrediction === 'higher'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          onClick={() => setSelectedPrediction('higher')}
          disabled={loading}
          aria-label="Predict higher price"
        >
          ▲ Higher
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPrediction === 'lower'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                event.entry_fee,
                Math.min(value, 1000)
              ));
            }}
            min={event.entry_fee}
            max={1000}
            step="25"
            className="w-full sm:w-24 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            disabled={loading}
            aria-label="Entry amount"
          />
          <button
            onClick={handleParticipation}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 w-full sm:w-auto transition-colors"
            disabled={!selectedPrediction || loading}
            aria-describedby="participation-error"
          >
            {isLoading ? 'Submitting...' : 'Participate'}
          </button>
        </div>
        
        {validationError && (
          <div
            id="participation-error"
            role="alert"
            className="text-red-500 text-sm mt-2 sm:mt-0"
          >
            {validationError}
          </div>
        )}
      </div>
      <p className="text-gray-500 text-sm mt-2">
        Entry fee: {event.entry_fee} points (non-refundable)
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