import React from 'react';
import PropTypes from 'prop-types';
import '../styles/admin.css';

const ProfileHistory = ({ history }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="admin-content">
      <div className="admin-component-header">
        <h2>Event Participation History</h2>
      </div>
      
      <div className="history-list">
        {history.length > 0 ? (
          history.map((entry) => (
            <div key={entry.participation_id} className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
              <div className="event-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-sm)',
                borderBottom: '1px solid var(--ui-border)'
              }}>
                <span className="event-title" style={{
                  fontWeight: '600',
                  color: 'var(--off-white)',
                  fontSize: '1.1rem'
                }}>
                  {entry.title || 'Untitled Event'}
                </span>
                <span className="event-date" style={{
                  color: 'var(--light-gray)',
                  fontSize: '0.875rem'
                }}>
                  {formatDate(entry.end_time) || 'N/A'}
                </span>
              </div>
              
              <div className="event-details" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div className="detail-row" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <span style={{ color: 'var(--light-gray)' }}>Prediction:</span>
                  <span className="prediction" style={{
                    fontWeight: '500',
                    color: 'var(--off-white)'
                  }}>
                    {entry.prediction || 'N/A'}
                  </span>
                </div>
                <div className="detail-row" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <span style={{ color: 'var(--light-gray)' }}>Entry Fee:</span>
                  <span className="entry-fee" style={{
                    color: 'var(--danger-red)',
                    fontWeight: '500'
                  }}>
                    -{entry.entry_fee || 0} pts
                  </span>
                </div>
                {entry.resolution_state === 'win' && (
                  <div className="detail-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Points Won:</span>
                    <span className="points" style={{
                      color: 'var(--success-green)',
                      fontWeight: '600'
                    }}>
                      +{entry.points_awarded || entry.entry_fee || 0} pts
                    </span>
                  </div>
                )}
                {entry.resolution_state === 'loss' && (
                  <div className="detail-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Result:</span>
                    <span className="result" style={{
                      color: 'var(--danger-red)',
                      fontWeight: '500'
                    }}>
                      Loss
                    </span>
                  </div>
                )}
                {entry.resolution_state === 'pending' && (
                  <div className="detail-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Status:</span>
                    <span className="result" style={{
                      color: '#fbbf24',
                      fontWeight: '500'
                    }}>
                      Resolution Pending
                    </span>
                  </div>
                )}
              </div>
              
              {entry.resolution_details && (
                <div className="resolution-details" style={{
                  padding: 'var(--spacing-sm)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)'
                }}>
                  <div className="price-movement" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Initial Price:</span>
                    <span style={{ color: 'var(--off-white)' }}>${entry.initial_price || 'N/A'}</span>
                  </div>
                  <div className="price-movement" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Final Price:</span>
                    <span style={{ color: 'var(--off-white)' }}>${entry.final_price || 'N/A'}</span>
                  </div>
                  <div className="correct-answer" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'var(--light-gray)' }}>Correct Prediction:</span>
                    <span style={{
                      color: 'var(--off-white)',
                      fontWeight: '500'
                    }}>
                      {entry.correct_answer || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-data">
            <p>No participation history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

ProfileHistory.propTypes = {
  history: PropTypes.arrayOf(
    PropTypes.shape({
      event_id: PropTypes.number.isRequired,
      title: PropTypes.string,
      end_time: PropTypes.string,
      prediction: PropTypes.string,
      entry_fee: PropTypes.number,
      points_awarded: PropTypes.number,
      resolution_state: PropTypes.oneOf(['win', 'loss', 'pending']).isRequired,
      initial_price: PropTypes.number,
      final_price: PropTypes.number,
      correct_answer: PropTypes.string,
      resolution_details: PropTypes.object
    })
  ).isRequired
};

export default ProfileHistory;