import React from 'react';
import { motion } from 'framer-motion';

const SuccessAnimation = () => {
  const icon = {
    hidden: { pathLength: 0, fill: 'rgba(255, 255, 255, 0)' },
    visible: {
      pathLength: 1,
      fill: 'rgba(255, 255, 255, 1)',
      transition: {
        default: { duration: 2, ease: 'easeInOut' },
        fill: { duration: 2, ease: [1, 0, 0.8, 1] },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-true-black z-50 flex flex-col items-center justify-center"
    >
      <motion.svg
        className="w-48 h-48"
        viewBox="0 0 24 24"
        initial="hidden"
        animate="visible"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          strokeWidth="2"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={icon}
        />
      </motion.svg>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-primary text-2xl font-semibold mt-4"
      >
        Prediction Finalized. Good Luck.
      </motion.p>
    </motion.div>
  );
};

export default SuccessAnimation;