// src/components/OutcomeVisualizer.jsx

import React from 'react';
import PropTypes from 'prop-types';

const OutcomeVisualizer = ({ options, optionVolumes, totalPool, onSelectPrediction, selectedPredictionValue }) => {
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const renderOptionBar = (option) => {
        const volumeData = optionVolumes ? (optionVolumes[option.value] || { total_amount: 0, multiplier: 0 }) : { total_amount: 0, multiplier: 0 };
        const isSelected = selectedPredictionValue === option.value;
        const isUp = option.value.includes('up');

        // Calculate a tangible reward example
        const exampleReward = (100 * (volumeData.multiplier || 0)).toFixed(0);

        return (
            <div
                key={option.id}
                className={`p-md rounded-md cursor-pointer border-2 transition-all duration-200 bg-charcoal ${
                    isSelected ? 'border-orange-primary scale-105 shadow-lg' : 'border-charcoal hover:border-gray-600'
                }`}
                onClick={() => onSelectPrediction({ ...option, multiplier: volumeData.multiplier })}
                role="button"
            >
                <div className="flex justify-between items-start mb-sm">
                    {/* Left Side: Outcome Label */}
                    <span className={`font-bold text-xl ${isUp ? 'text-success' : 'text-danger'}`}>{option.label}</span>
                    
                    {/* Right Side: Payout Info */}
                    <div className="text-right">
                        <span className="text-primary font-semibold text-xl block">{volumeData.multiplier.toFixed(2)}x Payout</span>
                        <span className="text-secondary text-xs">(Win {exampleReward} PTS with a 100 PTS bet)</span>
                    </div>
                </div>
                
                {/* Progress Bar and Total Bet */}
                <div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-2 rounded-full ${isUp ? 'bg-success' : 'bg-danger'}`}
                            style={{ width: `${totalPool > 0 ? (volumeData.total_amount / totalPool) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <div className="text-right text-xs text-secondary mt-1">
                        {volumeData.total_amount.toLocaleString()} PTS in Pool
                    </div>
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