import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const Snackbar = ({ message }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg"
    >
      {message}
    </motion.div>
  );
};

Snackbar.propTypes = {
  message: PropTypes.string.isRequired,
};

export default Snackbar;