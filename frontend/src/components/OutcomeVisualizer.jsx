// src/components/OutcomeVisualizer.jsx

import React from 'react';
import PropTypes from 'prop-types';

const OutcomeVisualizer = ({ options, optionVolumes, totalPool, onSelectPrediction, selectedPredictionValue }) => {
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const renderOptionBar = (option) => {
        const volumeData = optionVolumes ? (optionVolumes[option.value] || { total_amount: 0 }) : { total_amount: 0 };
        const percentage = totalPool > 0 ? (volumeData.total_amount / totalPool) * 100 : 0;
        const isSelected = selectedPredictionValue === option.value;
        const isUp = option.value.includes('up');
        // NOTE: The multiplier should ideally come from the API. We'll use a static 2.5x as a placeholder.
        const multiplier = 2.5; 

        return (
            <div 
                key={option.id}
                className={`p-md rounded-md cursor-pointer border-2 transition-all duration-200 bg-charcoal ${
                    isSelected ? 'border-orange-primary scale-105 shadow-lg' : 'border-charcoal hover:border-gray-600'
                }`}
                onClick={() => onSelectPrediction({ ...option, multiplier })}
                role="button"
            >
                <div className="flex justify-between items-center mb-sm">
                    <span className={`font-bold text-lg ${isUp ? 'text-success' : 'text-danger'}`}>{option.label}</span>
                    <span className="text-primary font-semibold text-lg">{multiplier}x Reward</span>
                </div>
                <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-3 rounded-full ${isUp ? 'bg-success' : 'bg-danger'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                        title={`${percentage.toFixed(1)}% of the prize pool`}
                    ></div>
                </div>
                <div className="text-right text-xs text-secondary mt-1">
                    {volumeData.total_amount.toLocaleString()} PTS Bet
                </div>
            </div>
        );
    }
    
    const upOptions = parsedOptions.filter(opt => opt.value.includes('up'));
    const downOptions = parsedOptions.filter(opt => opt.value.includes('down'));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-md">{upOptions.map(renderOptionBar)}</div>
            <div className="space-y-md">{downOptions.map(renderOptionBar)}</div>
        </div>
    );
};

OutcomeVisualizer.propTypes = {
    options: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
    optionVolumes: PropTypes.object,
    totalPool: PropTypes.number.isRequired,
    onSelectPrediction: PropTypes.func.isRequired,
    selectedPredictionValue: PropTypes.string,
};

export default OutcomeVisualizer;