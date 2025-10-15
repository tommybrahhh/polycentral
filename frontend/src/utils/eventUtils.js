// src/utils/eventUtils.js

export const normalizeEventOptions = (options) => {
  // Default options for display purposes if none are provided
  const fallbackOptions = [
    { id: 'range_0_3_up', label: '0-3% Up', value: '0-3% up' },
    { id: 'range_3_5_up', label: '3-5% Up', value: '3-5% up' },
    { id: 'range_5_up', label: '5%+ Up', value: '>5% up' },
    { id: 'range_0_3_down', label: '0-3% Down', value: '0-3% down' },
    { id: 'range_3_5_down', label: '3-5% Down', value: '3-5% down' },
    { id: 'range_5_down', label: '5%+ Down', value: '>5% down' }
  ];

  if (!options) return fallbackOptions;

  try {
    let parsedOptions = (typeof options === 'string') ? JSON.parse(options) : options;

    if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
      // If it's an array of strings, convert to objects
      if (typeof parsedOptions[0] === 'string') {
        return parsedOptions.map(opt => ({
          id: opt.toLowerCase().replace(/ /g, '_'),
          label: opt,
          value: opt
        }));
      }
      // If it's already an array of objects, return it
      return parsedOptions;
    }
  } catch (e) {
    console.error('Failed to parse event options:', e);
  }
  
  return fallbackOptions; // Return fallback on failure
};