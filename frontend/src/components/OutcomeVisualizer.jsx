// src/components/OutcomeVisualizer.jsx

import React from 'react';
import PropTypes from 'prop-types';

const OutcomeVisualizer = ({ options, optionVolumes, totalPool, onSelectPrediction, selectedPredictionValue }) => {
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

    const renderOptionCard = (option) => {
        const volumeData = optionVolumes ? (optionVolumes[option.value] || { total_amount: 0, multiplier: 0 }) : { total_amount: 0, multiplier: 0 };
        const isSelected = selectedPredictionValue === option.value;
        
        const isUp = option.value === 'Higher' || option.value.includes('up');
        const colorClass = isUp ? 'text-success' : 'text-danger';

        const exampleReward = (100 * (volumeData.multiplier || 0)).toFixed(0);

        return (
            <div
                key={option.id}
                className={`p-4 sm:p-6 rounded-lg cursor-pointer border-2 transition-all duration-200 bg-charcoal ${
                    isSelected ? 'border-orange-primary scale-105 shadow-lg' : 'border-charcoal hover:border-gray-600'
                }`}
                onClick={() => onSelectPrediction({ ...option, multiplier: volumeData.multiplier })}
                role="button"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                    <span className={`font-bold text-xl sm:text-2xl ${colorClass}`}>{option.label}</span>
                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                        <span className="text-primary font-semibold text-lg sm:text-xl block">{volumeData.multiplier ? volumeData.multiplier.toFixed(2) : '0.00'}x Payout</span>
                        <span className="text-secondary text-xs sm:text-sm">(Win {exampleReward} PTS with a 100 PTS bet)</span>
                    </div>
                </div>
                <div>
                    <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-2.5 rounded-full ${isUp ? 'bg-success' : 'bg-danger'}`}
                            style={{ width: `${totalPool > 0 ? (volumeData.total_amount / totalPool) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <div className="text-right text-xs sm:text-sm text-secondary mt-2">
                        {volumeData.total_amount.toLocaleString()} PTS in Pool
                    </div>
                </div>
            </div>
        );
    }

    if (parsedOptions.length === 2) {
        const lowerOption = parsedOptions.find(opt => opt.value === 'Lower');
        const higherOption = parsedOptions.find(opt => opt.value === 'Higher');

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {lowerOption && renderOptionCard(lowerOption)}
                {higherOption && renderOptionCard(higherOption)}
            </div>
        );
    } else {
        const upOptions = parsedOptions.filter(opt => opt.value.includes('up'));
        const downOptions = parsedOptions.filter(opt => opt.value.includes('down'));

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-4">{upOptions.map(renderOptionCard)}</div>
                <div className="space-y-4">{downOptions.map(renderOptionCard)}</div>
            </div>
        );
    }
};

OutcomeVisualizer.propTypes = {
    options: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
    optionVolumes: PropTypes.object,
    totalPool: PropTypes.number.isRequired,
    onSelectPrediction: PropTypes.func.isRequired,
    selectedPredictionValue: PropTypes.string,
};

export default OutcomeVisualizer;