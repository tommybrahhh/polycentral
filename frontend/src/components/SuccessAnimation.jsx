import React from 'react';
import { motion } from 'framer-motion';

const SuccessAnimation = () => {
  const icon = {
    hidden: { pathLength: 0, fill: 'rgba(255, 255, 255, 0)' },
    visible: {
      pathLength: 1,
      fill: 'rgba(255, 255, 255, 1)',
      transition: {
        default: { duration: 1.5, ease: 'easeInOut' },
        fill: { duration: 1.5, ease: [1, 0, 0.8, 1] },
      },
    },
  };

  const circleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
    >
      <motion.div
        className="bg-ui-surface border border-ui-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 glass-effect"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex flex-col items-center">
          {/* Animated circle background */}
          <motion.div
            className="w-32 h-32 rounded-full bg-orange-primary flex items-center justify-center mb-6 relative"
            variants={circleVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="absolute inset-0 bg-orange-primary rounded-full opacity-20 animate-ping"></div>
            <motion.svg
              className="w-20 h-20"
              viewBox="0 0 24 24"
              initial="hidden"
              animate="visible"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                strokeWidth="2.5"
                stroke="var(--dark-charcoal)"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={icon}
              />
            </motion.svg>
          </motion.div>
          
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-2xl font-bold text-off-white text-center mb-2"
          >
            Prediction Submitted!
          </motion.h3>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-light-gray text-center mb-6 text-lg"
          >
            Your bet has been placed successfully. Good luck!
          </motion.p>
          
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="btn btn-primary px-8 py-3 text-lg font-semibold"
            onClick={() => window.location.reload()}
          >
            Continue
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SuccessAnimation;