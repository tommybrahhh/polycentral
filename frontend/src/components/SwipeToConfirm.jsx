import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useDrag } from '@use-gesture/react';

const SwipeToConfirm = ({ onConfirm }) => {
  const [style, api] = React.useState({ x: 0 });

  const bind = useDrag(({ down, movement: [mx], memo = style.x }) => {
    if (mx > 250) { // Assuming the container width is around 300-400px
      onConfirm();
    }
    if (!down) mx = 0; // Reset on release if not confirmed
    api.start({ x: mx < 0 ? 0 : mx });
    return memo;
  }, { axis: 'x', bounds: { left: 0, right: 300 } });

  return (
    <div className="w-full bg-gray-800 rounded-full p-2 relative flex items-center justify-center">
      <span className="text-gray-400 font-semibold z-10">Swipe to Finalize</span>
      <motion.div
        {...bind()}
        style={{ x: style.x }}
        className="absolute left-2 top-2 bottom-2 w-16 h-10 bg-primary rounded-full cursor-grab active:cursor-grabbing z-20 flex items-center justify-center"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </div>
  );
};

SwipeToConfirm.propTypes = {
  onConfirm: PropTypes.func.isRequired,
};

export default SwipeToConfirm;