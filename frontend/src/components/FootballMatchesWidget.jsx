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

    // Add the fixtures widget for Real Madrid's next game (better approach)
    const fixturesWidget = document.createElement('api-sports-widget');
    fixturesWidget.setAttribute('data-type', 'fixtures');
    fixturesWidget.setAttribute('data-team', '541'); // Real Madrid ID
    fixturesWidget.setAttribute('data-season', '2025'); // 2025 season
    fixturesWidget.setAttribute('data-next', '1'); // Next game only

    // Append widgets to container
    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(configScript);
      widgetContainerRef.current.appendChild(fixturesWidget);
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
      <h2 className="text-xl font-semibold mb-4 text-primary">Next Real Madrid Match</h2>
      <p className="text-secondary mb-4">Upcoming Real Madrid fixture from API-SPORTS</p>
      
      <div ref={widgetContainerRef} className="widget-container">
        {/* Widgets will be injected here */}
      </div>
    </div>
  );
};

export default FootballMatchesWidget;