// Voice SaaS Widget Source
// This file is built into widget.bundle.js using esbuild

(function() {
  // Store a reference to the script tag that loaded this widget
  const scriptTag = document.currentScript;
  
  // Widget version (hardcoded version instead of using process.env)
  const version = '1.3.0';
  
  // Configuration from script tag data attributes
  const config = {
    agentId: scriptTag.getAttribute('data-agent-id'),
    jwtEndpoint: scriptTag.getAttribute('data-jwt-endpoint'),
    tokenUrl: scriptTag.getAttribute('data-token-endpoint'),
    name: scriptTag.getAttribute('data-name') || 'Assistant',
    themeColor: scriptTag.getAttribute('data-theme-color') || '#0077ff',
    position: scriptTag.getAttribute('data-position') || 'bottom-right'
  };
  
  // Helper for logging
  const log = (message) => {
    if (window.DEBUG_WIDGET) {
      console.log(`[VoiceSaaS Widget] ${message}`);
    }
  };
  
  log(`Widget loaded (version ${version})`);
  
  // Load external CSS file instead of injecting styles inline
  function loadExternalCSS() {
    // Prevent duplicate style injection
    if (window.__vsStylesInjected) return;
    window.__vsStylesInjected = true;
    
    // Get the CDN base from the script tag
    const cdnBase = new URL(scriptTag.src).origin;
    
    // Create link element for external CSS
    const link = document.createElement('link');
    link.id = 'vs-widget-css';
    link.rel = 'stylesheet';
    
    // gleiche Version wie die JS-Datei laden
    link.href = scriptTag.src.replace(/\.js$/, '.css');
    
    document.head.appendChild(link);
    
    return link;
  }
  
  // Create a dynamic style element for theme-specific CSS
  function injectThemeStyles() {
    // Create style element for dynamic theme-related styles
    const themeStyle = document.createElement('style');
    
    // Only inject the dynamic theme colors, not all CSS
    themeStyle.textContent = `
      .voice-saas-widget-button {
        background: ${config.themeColor};
      }
      .voice-saas-widget-header {
        background: ${config.themeColor};
      }
      .voice-saas-widget-message.user {
        background: ${config.themeColor};
      }
      .voice-saas-widget-retry-button {
        background: ${config.themeColor};
      }
    `;
    
    document.head.appendChild(themeStyle);
  }
  
  // Add a message to the chat
  function addMessage(elements, text, isUser = false) {
    const message = document.createElement('div');
    message.className = `voice-saas-widget-message ${isUser ? 'user' : 'assistant'}`;
    message.textContent = text;
    elements.messagesContainer.appendChild(message);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    return message;
  }
  
  // Show "thinking" animation
  function showThinking(elements) {
    const thinking = document.createElement('div');
    thinking.className = 'voice-saas-widget-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      thinking.appendChild(dot);
    }
    elements.messagesContainer.appendChild(thinking);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    return thinking;
  }
  
  // Build the entire widget UI (combines createChatPanel and buildChatUI into one function)
  function buildWidgetUI() {
    // Create the panel
    const panel = document.createElement('div');
    panel.className = 'voice-saas-widget-dialog';
    panel.id = 'vs-chat';
    
    Object.assign(panel.style, {
      position: 'fixed',
      right: '24px',
      bottom: '80px',
      width: '380px',
      height: '600px',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      background: '#ffffff',
      display: 'none',
      zIndex: '9999',
      overflow: 'hidden',
      flexDirection: 'column'
    });
    
    // Clear any existing content
    panel.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'voice-saas-widget-header';
    Object.assign(header.style, {
      background: config.themeColor,
      color: '#ffffff',
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    
    const headerTitle = document.createElement('div');
    headerTitle.textContent = config.name;
    headerTitle.style.fontWeight = 'bold';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.className = 'voice-saas-widget-close-button';
    Object.assign(closeButton.style, {
      background: 'transparent',
      border: 'none',
      color: '#ffffff',
      cursor: 'pointer',
      fontSize: '16px'
    });
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    panel.appendChild(header);
    
    // Create message container
    const chatContent = document.createElement('div');
    chatContent.className = 'voice-saas-widget-content';
    Object.assign(chatContent.style, {
      flex: '1',
      padding: '16px',
      overflowY: 'auto',
      height: 'calc(100% - 100px)'
    });
    
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'voice-saas-widget-messages';
    chatContent.appendChild(messagesContainer);
    panel.appendChild(chatContent);
    
    // Create footer with status
    const footer = document.createElement('div');
    footer.className = 'voice-saas-widget-footer';
    Object.assign(footer.style, {
      borderTop: '1px solid #eee',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center'
    });
    
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'voice-saas-widget-status';
    statusIndicator.textContent = 'Click microphone to speak';
    statusIndicator.style.fontSize = '14px';
    statusIndicator.style.color = '#666';
    
    footer.appendChild(statusIndicator);
    panel.appendChild(footer);
    
    // Create hidden audio container
    const audioContainer = document.createElement('div');
    audioContainer.id = 'voice-saas-widget-audio-container';
    audioContainer.style.display = 'none';
    panel.appendChild(audioContainer);
    
    // Add to the document
    document.body.appendChild(panel);
    
    // Return both the panel and all interactive elements
    return {
      panel,
      elements: {
        messagesContainer,
        closeButton,
        statusIndicator,
        audioContainer
      }
    };
  }
  
  // Main function to initialize widget
  async function initWidget() {
    // Create mic button
    const micButton = document.createElement('button');
    micButton.className = 'voice-saas-widget-button';
    micButton.innerHTML = '🎙️';
    Object.assign(micButton.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: config.themeColor,
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      zIndex: '9998'
    });
    document.body.appendChild(micButton);
    
    // Create chat panel and UI elements with one function
    const { panel, elements } = buildWidgetUI();
    log('Widget UI created');
    
    let livekitRoom = null;
    let isConnected = false;
    let isMicActive = false;
    let micTrack = null;
    let audioContext = null;
    
    // Close button handler
    elements.closeButton.addEventListener('click', () => {
      panel.style.display = 'none';
      disconnectFromLiveKit();
    });
    
    // Disconnect from LiveKit
    async function disconnectFromLiveKit() {
      // Stop microphone track first (not just unpublish)
      if (micTrack) {
        log('Stopping microphone track');
        micTrack.stop();
        micTrack = null;
      }
      
      // Clean up any unmute buttons
      const unmuteBtn = panel.querySelector('button[class^="unmute"]');
      if (unmuteBtn) unmuteBtn.remove();
      
      if (livekitRoom) {
        log('Disconnecting from LiveKit');
        await livekitRoom.disconnect();
        livekitRoom = null;
        isConnected = false;
        isMicActive = false;
      }
      
      // Clean up audio resources
      if (audioContext && audioContext.state !== 'closed') {
        try {
          await audioContext.close();
          log('AudioContext closed');
        } catch (err) {
          console.warn('Error closing AudioContext:', err);
        }
        audioContext = null;
      }
      
      // Clean up audio elements
      if (elements.audioContainer) {
        elements.audioContainer.innerHTML = '';
      }
      
      elements.statusIndicator.textContent = 'Click microphone to speak';
    }
    
    // Microphone button click handler
    micButton.addEventListener('click', async () => {
      // Toggle chat visibility
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        
        // If not already connected, initiate connection with full audio setup
        if (!isConnected) {
          try {
            elements.statusIndicator.textContent = 'Requesting microphone access...';
            
            // LiveKit Client dynamisch laden, wenn nicht vorhanden (mit Cache)
            if (!window.LivekitClient && !window.livekit && !window.__loadingLiveKit) {
              window.__loadingLiveKit = true;
              log('Loading LiveKit client library');
              
              try {
                await new Promise((resolve, reject) => {
                  // Check if script already exists to prevent multiple loads
                  if (document.querySelector('script[src*="livekit-client"]')) {
                    log('LiveKit script already exists, waiting for it to load');
                    return resolve();
                  }
                  
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js';
                  script.onload = resolve;
                  script.onerror = reject;
                  document.head.appendChild(script);
                });
                log('LiveKit client library loaded successfully');
              } catch (err) {
                window.__loadingLiveKit = false;
                throw new Error(`Failed to load LiveKit: ${err.message}`);
              }
            } else if (window.__loadingLiveKit) {
              log('Waiting for LiveKit to finish loading');
              // Wait for LiveKit to finish loading
              while (window.__loadingLiveKit && !window.LivekitClient && !window.livekit) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            const LiveKit = window.LivekitClient || window.livekit;
            if (!LiveKit) {
              throw new Error('Failed to load LiveKit client');
            }
            
            // Mikrofonzugriff anfordern - direkt im Click-Handler
            micTrack = await LiveKit.createLocalAudioTrack({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            });
            
            log('Microphone access granted');
            elements.statusIndicator.textContent = 'Setting up audio...';
            
            // AudioContext erstellen und fortsetzen
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            try {
              await audioContext.resume();
              log('AudioContext resumed successfully');
            } catch (err) {
              console.warn('AudioContext.resume() failed:', err);
              log(`AudioContext resume error: ${err.message}`);
            }
            
            // Silent Buffer abspielen
            try {
              const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContext.destination);
              source.start();
              log('Silent buffer played to unlock audio');
            } catch (err) {
              console.warn('Silent buffer playback failed:', err);
              log(`Silent buffer error: ${err.message}`);
            }
            
            elements.statusIndicator.textContent = 'Connecting...';
            
            // Widget JWT holen
            const widgetJwtResponse = await fetch(config.jwtEndpoint, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({agentId: config.agentId}),
              credentials: 'include'
            });
            
            if (!widgetJwtResponse.ok) {
              throw new Error('Failed to get widget authentication');
            }
            
            const { jwt: widgetJwt } = await widgetJwtResponse.json();
            
            // Generate a room name with the agent ID and timestamp
            const timestamp = Date.now();
            const roomName = `agent-${config.agentId}-${timestamp}`;
            log(`Generated room name: ${roomName}`);
            
            // Token-Request mit roomName und jwtFromWidget
            const tokenResponse = await fetch(config.tokenUrl, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                agentId: config.agentId,
                roomName: roomName,
                jwtFromWidget: widgetJwt
              }),
              credentials: 'include'
            });
            
            if (!tokenResponse.ok) {
              throw new Error('Failed to get connection token');
            }
            
            const { token, url } = await tokenResponse.json();
            
            // LiveKit Room erstellen und verbinden
            livekitRoom = new LiveKit.Room({
              adaptiveStream: true,
              dynacast: true,
              audioPreferHighQuality: true
            });
            
            // Set AudioContext for LiveKit
            livekitRoom.setAudioContext(audioContext);
            
            // Connect to LiveKit room
            await livekitRoom.connect(url, token);
            
            // Start audio playback (important to unlock audio in browser)
            try {
              await livekitRoom.startAudio();
              log('Room audio started successfully');
            } catch (err) {
              console.warn('room.startAudio() failed:', err);
              log(`Room audio start error: ${err.message}`);
              
              // Add manual unmute button if needed (especially for Safari)
              const unmuteBtn = document.createElement('button');
              unmuteBtn.textContent = '🔊 Tap to unmute';
              Object.assign(unmuteBtn.style, {
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                zIndex: '999',
                padding: '8px 12px',
                background: '#0077ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              });
              
              unmuteBtn.onclick = async () => {
                try {
                  await livekitRoom.startAudio();
                  unmuteBtn.remove();
                } catch(e) {
                  console.error('Failed to start audio:', e);
                }
              };
              
              panel.appendChild(unmuteBtn);
            }
            
            isConnected = true;
            log('Connected to LiveKit room');
            
            // Publish microphone track
            await livekitRoom.localParticipant.publishTrack(micTrack);
            isMicActive = true;
            elements.statusIndicator.textContent = 'Listening...';
            log('Microphone track published');
            
            // Add greeting message
            addMessage(elements, `Hello! I'm ${config.name}. How can I help you today?`);
            
            // Handle remote participants
            livekitRoom.on('participantConnected', participant => {
              log(`${participant.identity} connected`);
              
              participant.on('trackSubscribed', (track, publication) => {
                if (track.kind === 'audio') {
                  log('Received audio track from assistant');
                  
                  // Attach audio element and enable autoplay
                  const audioEl = track.attach();
                  audioEl.autoplay = true;
                  audioEl.volume = 1.0;
                  
                  // Hide but keep in DOM for audio playback
                  audioEl.style.display = 'none';
                  elements.audioContainer.appendChild(audioEl);
                  
                  // Connect through Web Audio API for better audio handling
                  if (audioContext && audioContext.state === 'running') {
                    const mediaStreamSource = audioContext.createMediaStreamSource(
                      new MediaStream([track.mediaStreamTrack])
                    );
                    mediaStreamSource.connect(audioContext.destination);
                  }
                }
              });
            });
            
            // Handle data channel messages
            livekitRoom.on('dataReceived', (payload, participant) => {
              try {
                const data = JSON.parse(new TextDecoder().decode(payload));
                log(`Message received: ${JSON.stringify(data)}`);
                
                // Handle assistant message
                if (data.type === 'assistant_message') {
                  // Remove thinking indicator if present
                  const thinking = document.querySelector('.voice-saas-widget-thinking');
                  if (thinking) {
                    thinking.remove();
                  }
                  
                  addMessage(elements, data.text, false);
                  elements.statusIndicator.textContent = 'Listening...';
                } 
                // Handle transcript (user speech)
                else if (data.type === 'transcript') {
                  if (data.is_final) {
                    addMessage(elements, data.text, true);
                    
                    // Show thinking indicator
                    showThinking(elements);
                    elements.statusIndicator.textContent = 'Assistant is thinking...';
                  }
                }
              } catch (error) {
                log(`Error parsing message: ${error.message}`);
              }
            });
          } catch (error) {
            log(`Error: ${error.message}`);
            
            // Handle microphone permission errors
            if (error.name === 'NotAllowedError') {
              elements.statusIndicator.textContent = 'Microphone access denied';
              
              // Add retry button for microphone access
              const retryBtn = document.createElement('button');
              retryBtn.textContent = '🎙️ Allow microphone access';
              retryBtn.className = 'voice-saas-widget-retry-button';
              Object.assign(retryBtn.style, {
                margin: '10px auto',
                display: 'block',
                padding: '8px 16px',
                background: config.themeColor,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              });
              
              // Remove any existing retry buttons
              const existingRetry = panel.querySelector('.voice-saas-widget-retry-button');
              if (existingRetry) existingRetry.remove();
              
              // Add new retry button
              elements.messagesContainer.appendChild(retryBtn);
              
              // Add click handler
              retryBtn.addEventListener('click', async () => {
                retryBtn.remove();
                // Try to check permission state if browser supports it
                if (navigator.permissions && navigator.permissions.query) {
                  try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                    log(`Microphone permission status: ${permissionStatus.state}`);
                    
                    if (permissionStatus.state === 'denied') {
                      // Show instructions for browser settings
                      addMessage(elements, "Please enable microphone access in your browser settings and refresh the page.", false);
                      return;
                    }
                  } catch (e) {
                    log(`Error checking permissions: ${e.message}`);
                  }
                }
                
                // Retry connecting
                panel.style.display = 'none';
                setTimeout(() => micButton.click(), 500);
              });
            } else if (error.message.includes('WebSocket')) {
              elements.statusIndicator.textContent = 'Network error';
            } else {
              elements.statusIndicator.textContent = 'Connection failed';
            }
          }
        }
      } else if (isConnected) {
        // Toggle microphone if already connected
        if (isMicActive) {
          // Turn off microphone
          if (livekitRoom) {
            livekitRoom.localParticipant.unpublishAllTracks();
            isMicActive = false;
            elements.statusIndicator.textContent = 'Microphone off';
            micButton.style.background = '#999';
          }
        } else {
          // Turn on microphone
          try {
            elements.statusIndicator.textContent = 'Requesting microphone access...';
            
            const LiveKit = window.LivekitClient || window.livekit;
            // Request microphone access again directly in click handler
            micTrack = await LiveKit.createLocalAudioTrack({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            });
            
            await livekitRoom.localParticipant.publishTrack(micTrack);
            isMicActive = true;
            elements.statusIndicator.textContent = 'Listening...';
            micButton.style.background = config.themeColor;
          } catch (micError) {
            log(`Microphone reactivation error: ${micError.message}`);
            if (micError.name === 'NotAllowedError') {
              elements.statusIndicator.textContent = 'Microphone access denied';
            } else if (micError.message.includes('WebSocket')) {
              elements.statusIndicator.textContent = 'Network error';
            } else {
              elements.statusIndicator.textContent = 'Could not access microphone';
            }
          }
        }
      }
    });
    
    // Handle audio unlock on document events
    document.addEventListener('click', function audioUnlock() {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
          .then(() => log('AudioContext resumed by user interaction'))
          .catch(e => console.warn('AudioContext resume error:', e));
      }
      
      if (livekitRoom) {
        livekitRoom.startAudio()
          .then(() => log('LiveKit audio started by user interaction'))
          .catch(e => console.warn('LiveKit startAudio error:', e));
      }
      
      document.removeEventListener('click', audioUnlock);
    }, { once: true });
    
    // Ensure thorough cleanup on page unload
    window.addEventListener('beforeunload', () => {
      // Stop microphone track directly
      if (micTrack) {
        micTrack.stop();
        micTrack = null;
      }
      
      // Clean up LiveKit
      if (livekitRoom) {
        livekitRoom.disconnect();
      }
      
      // Close AudioContext
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      
      // Remove all audio elements
      if (elements.audioContainer) {
        elements.audioContainer.innerHTML = '';
      }
    });
  }
  
  // Main initialization
  function init() {
    loadExternalCSS();
    injectThemeStyles();
    initWidget();
  }
  
  // Check if the document is ready or wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export public API
  window.VoiceSaasWidget = {
    version: version,
    createWidget: function(customConfig) {
      // Option to programmatically create widget with custom config
      Object.assign(config, customConfig);
      loadExternalCSS();
      injectThemeStyles();
      return initWidget();
    }
  };
})();