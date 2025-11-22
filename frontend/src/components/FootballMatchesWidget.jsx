import React, { useEffect, useRef } from 'react';

const FootballMatchesWidget = () => {
  const widgetContainerRef = useRef(null);

  useEffect(() => {
    // Check if script already exists
    if (document.querySelector('script[src="https://widgets.api-sports.io/3.1.0/widgets.js"]')) {
      return; // Script already loaded
    }

    // Load the API-SPORTS widget script
    const script = document.createElement('script');
    script.type = 'module';
    script.crossOrigin = 'anonymous';
    script.src = 'https://widgets.api-sports.io/3.1.0/widgets.js';
    script.async = true;
    
    // Add the widget configuration
    const configScript = document.createElement('api-sports-widget');
    configScript.setAttribute('data-type', 'config');
    configScript.setAttribute('data-key', 'f4bd10a216c6c769c3f49cfa0182cc44');
    configScript.setAttribute('data-theme', 'dark');
    configScript.setAttribute('data-sport', 'football');

    // Add the games widget with exact parameters for Elche vs Real Madrid
    const gamesWidget = document.createElement('api-sports-widget');
    gamesWidget.setAttribute('data-type', 'games');
    gamesWidget.setAttribute('data-league', '140'); // La Liga
    gamesWidget.setAttribute('data-season', '2025'); // 2025 season
    gamesWidget.setAttribute('data-date', '2025-11-23'); // Tomorrow's date
    gamesWidget.setAttribute('data-show-errors', 'false');

    // Append widgets to container
    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(configScript);
      widgetContainerRef.current.appendChild(gamesWidget);
    }

    // Append script to head to load it globally
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="football-matches-widget">
      <h2 className="text-xl font-semibold mb-4 text-primary">Upcoming Football Matches</h2>
      <p className="text-secondary mb-4">Live football matches from API-SPORTS for tomorrow (2025-11-23)</p>
      
      <div ref={widgetContainerRef} className="widget-container">
        {/* Widgets will be injected here */}
      </div>
    </div>
  );
};

export default FootballMatchesWidget;