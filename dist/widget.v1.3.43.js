"use strict";
(() => {
  // src/voice-saas-app/public/widget.src.js
  (function() {
    const scriptTag = document.currentScript;
    const version = typeof BUILD_VERSION !== "undefined" ? BUILD_VERSION : "dev";
    const config = {
      agentId: scriptTag.getAttribute("data-agent-id"),
      jwtEndpoint: scriptTag.getAttribute("data-jwt-endpoint"),
      tokenUrl: scriptTag.getAttribute("data-token-endpoint"),
      name: scriptTag.getAttribute("data-name") || "Assistant",
      themeColor: scriptTag.getAttribute("data-theme-color") || "#0077ff",
      position: scriptTag.getAttribute("data-position") || "bottom-right"
    };
    const log = (message) => {
      if (window.DEBUG_WIDGET) {
        console.log(`[VoiceSaaS Widget] ${message}`);
      }
    };
    function scrollToBottom(container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
    function injectThemeStyles() {
      const themeStyle = document.createElement("style");
      themeStyle.textContent = `
      :root {
        --vs-primary-color: #000;      /* Black */
        --vs-primary-text: #fff;       /* White */
        --vs-bg-assistant: #fff;       /* White background for bot */
        --vs-text-assistant: #000;     /* Black text for bot */
        --vs-bg-user: #000;            /* Black background for user */
        --vs-text-user: #fff;          /* White text for user */
      }

      /* Dialog mit Glass-Morphism */
      .voice-saas-widget-dialog {
        border-radius: 24px;
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(12px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      /* Header mit prim\xE4rer Farbe - now black */
      .voice-saas-widget-header {
        background: var(--vs-primary-color);
        color: var(--vs-primary-text);
        padding: 16px;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        position: relative;  /* For close button positioning */
      }

      /* Nachrichten-Styling */
      .voice-saas-widget-content { padding: 12px 16px; overflow-y: auto; }
      
      /* User messages - now black background with white text */
      .voice-saas-widget-message.user {
        background: var(--vs-bg-user);
        color: var(--vs-text-user);
        align-self: flex-end;
        border-radius: 18px 18px 4px 18px;
        padding: 10px 14px;
        margin-bottom: 10px;
        max-width: 80%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      
      /* Assistant messages - now white background with black text */
      .voice-saas-widget-message.assistant {
        background: var(--vs-bg-assistant);
        color: var(--vs-text-assistant);
        align-self: flex-start;
        border-radius: 18px 18px 18px 4px;
        padding: 10px 14px;
        margin-bottom: 10px;
        max-width: 80%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      }
      
      .voice-saas-widget-messages {
        display: flex;
        flex-direction: column;
      }

      /* Footer */
      .voice-saas-widget-footer {
        padding: 14px 16px;
        border-bottom-left-radius: 24px;
        border-bottom-right-radius: 24px;
        background: rgba(250,250,250,0.7);
      }

      /* 3D-Effekt f\xFCr den Mikro-Button - now black */
      .voice-saas-widget-button {
        background: var(--vs-primary-color);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transform: perspective(200px) translateZ(2px);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        color: var(--vs-primary-text);
      }
      .voice-saas-widget-button:hover {
        filter: brightness(1.1);
        transform: perspective(200px) translateZ(5px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.15);
      }
      
      /* Close Button Styling - moved to top right corner */
      .voice-saas-widget-close-button {
        position: absolute;
        right: 8px;
        top: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: rgba(255,255,255,0.15);
        color: white;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .voice-saas-widget-close-button:hover {
        background: rgba(255,255,255,0.3);
      }
      
      /* Thinking animation */
      .voice-saas-widget-thinking {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 10px;
      }
      .voice-saas-widget-thinking span {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin: 0 3px;
        background: #ccc;
        border-radius: 50%;
        animation: thinking 1.4s infinite ease-in-out both;
      }
      .voice-saas-widget-thinking span:nth-child(1) { animation-delay: 0s; }
      .voice-saas-widget-thinking span:nth-child(2) { animation-delay: 0.2s; }
      .voice-saas-widget-thinking span:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes thinking {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
      
      /* Retry button */
      .voice-saas-widget-retry-button {
        margin: 10px auto;
        display: block;
        padding: 8px 16px;
        background: var(--vs-primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        transition: all 0.2s;
      }
      .voice-saas-widget-retry-button:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        transform: translateY(-1px);
      }
    `;
      document.head.appendChild(themeStyle);
    }
    function addMessage(elements, text, isUser = false) {
      const message = document.createElement("div");
      message.className = `voice-saas-widget-message ${isUser ? "user" : "assistant"}`;
      message.textContent = text;
      elements.messagesContainer.appendChild(message);
      scrollToBottom(elements.messagesContainer);
      return message;
    }
    function attachAssistantAudio(elements, audioContext, track) {
      if (track.kind !== "audio")
        return;
      log("Received audio track from assistant");
      const audioEl = track.attach();
      audioEl.autoplay = true;
      audioEl.volume = 1;
      audioEl.style.display = "none";
      elements.audioContainer.appendChild(audioEl);
      if (audioContext && audioContext.state === "running") {
        const mediaStreamSource = audioContext.createMediaStreamSource(
          new MediaStream([track.mediaStreamTrack])
        );
        mediaStreamSource.connect(audioContext.destination);
      }
    }
    function showThinking(elements) {
      const thinking = document.createElement("div");
      thinking.className = "voice-saas-widget-thinking";
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        thinking.appendChild(dot);
      }
      elements.messagesContainer.appendChild(thinking);
      scrollToBottom(elements.messagesContainer);
      return thinking;
    }
    function buildWidgetUI() {
      const panel = document.createElement("div");
      panel.className = "voice-saas-widget-dialog";
      panel.id = "vs-chat";
      Object.assign(panel.style, {
        position: "fixed",
        right: "24px",
        bottom: "80px",
        width: "380px",
        height: "600px",
        display: "none",
        zIndex: "9999",
        overflow: "hidden",
        flexDirection: "column"
      });
      panel.innerHTML = "";
      const header = document.createElement("div");
      header.className = "voice-saas-widget-header";
      const headerTitle = document.createElement("div");
      headerTitle.textContent = config.name;
      headerTitle.style.fontWeight = "bold";
      const closeButton = document.createElement("button");
      closeButton.className = "voice-saas-widget-close-button";
      closeButton.setAttribute("aria-label", "Schlie\xDFen");
      closeButton.innerHTML = `
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" stroke="currentColor" stroke-width="2" fill="none">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
      closeButton.tabIndex = 0;
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ")
          e.target.click();
      });
      header.appendChild(headerTitle);
      header.appendChild(closeButton);
      panel.appendChild(header);
      const chatContent = document.createElement("div");
      chatContent.className = "voice-saas-widget-content";
      const messagesContainer = document.createElement("div");
      messagesContainer.className = "voice-saas-widget-messages";
      chatContent.appendChild(messagesContainer);
      panel.appendChild(chatContent);
      const footer = document.createElement("div");
      footer.className = "voice-saas-widget-footer";
      const statusIndicator = document.createElement("div");
      statusIndicator.className = "voice-saas-widget-status";
      statusIndicator.textContent = "Click microphone to speak";
      statusIndicator.style.fontSize = "14px";
      statusIndicator.style.color = "#666";
      footer.appendChild(statusIndicator);
      panel.appendChild(footer);
      const audioContainer = document.createElement("div");
      audioContainer.id = "voice-saas-widget-audio-container";
      audioContainer.style.display = "none";
      panel.appendChild(audioContainer);
      document.body.appendChild(panel);
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
    async function initWidget() {
      const messageBuffer = [];
      const micButton = document.createElement("button");
      micButton.className = "voice-saas-widget-button";
      micButton.setAttribute("aria-label", "Spracheingabe starten");
      micButton.innerHTML = `
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
    <path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/>
    <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 18 0h-2z"/>
    <path d="M12 21v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
      micButton.tabIndex = 0;
      micButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ")
          e.target.click();
      });
      Object.assign(micButton.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        zIndex: "9998",
        color: "#ffffff"
      });
      document.body.appendChild(micButton);
      const { panel, elements } = buildWidgetUI();
      log("Widget UI created");
      let livekitRoom = null;
      let isConnected = false;
      let isMicActive = false;
      let micTrack = null;
      let audioContext = null;
      elements.closeButton.addEventListener("click", () => {
        panel.style.display = "none";
        disconnectFromLiveKit();
        messageBuffer.length = 0;
        elements.messagesContainer.innerHTML = "";
      });
      async function disconnectFromLiveKit() {
        if (micTrack) {
          log("Stopping microphone track");
          micTrack.stop();
          micTrack = null;
        }
        const unmuteBtn = panel.querySelector(".unmute-button");
        if (unmuteBtn)
          unmuteBtn.remove();
        if (livekitRoom) {
          log("Disconnecting from LiveKit");
          await livekitRoom.disconnect();
          livekitRoom = null;
          isConnected = false;
          isMicActive = false;
        }
        if (audioContext && audioContext.state !== "closed") {
          try {
            await audioContext.close();
            log("AudioContext closed");
          } catch (err) {
            console.warn("Error closing AudioContext:", err);
          }
          audioContext = null;
        }
        if (elements.audioContainer) {
          elements.audioContainer.innerHTML = "";
        }
        messageBuffer.length = 0;
        elements.messagesContainer.innerHTML = "";
        elements.statusIndicator.textContent = "Click microphone to speak";
      }
      micButton.addEventListener("click", async () => {
        if (panel.style.display === "none") {
          panel.style.display = "flex";
          if (!isConnected) {
            try {
              elements.statusIndicator.textContent = "Requesting microphone access...";
              if (!window.LivekitClient && !window.livekit && !window.__loadingLiveKit) {
                window.__loadingLiveKit = true;
                log("Loading LiveKit client library");
                try {
                  await new Promise((resolve, reject) => {
                    if (document.querySelector('script[src*="livekit-client"]')) {
                      log("LiveKit script already exists, waiting for it to load");
                      return resolve();
                    }
                    const script = document.createElement("script");
                    script.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.11.0/dist/livekit-client.umd.min.js";
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                  });
                  log("LiveKit client library loaded successfully");
                } catch (err) {
                  window.__loadingLiveKit = false;
                  throw new Error(`Failed to load LiveKit: ${err.message}`);
                }
              } else if (window.__loadingLiveKit) {
                log("Waiting for LiveKit to finish loading");
                while (window.__loadingLiveKit && !window.LivekitClient && !window.livekit) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
              }
              const LiveKit = window.LivekitClient || window.livekit;
              if (!LiveKit) {
                throw new Error("Failed to load LiveKit client");
              }
              micTrack = await LiveKit.createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              });
              log("Microphone access granted");
              elements.statusIndicator.textContent = "Setting up audio...";
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              try {
                await audioContext.resume();
                log("AudioContext resumed successfully");
              } catch (err) {
                console.warn("AudioContext.resume() failed:", err);
                log(`AudioContext resume error: ${err.message}`);
              }
              try {
                const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start();
                log("Silent buffer played to unlock audio");
              } catch (err) {
                console.warn("Silent buffer playback failed:", err);
                log(`Silent buffer error: ${err.message}`);
              }
              elements.statusIndicator.textContent = "Connecting...";
              const widgetJwtResponse = await fetch(config.jwtEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId: config.agentId }),
                credentials: "include"
              });
              if (!widgetJwtResponse.ok) {
                throw new Error("Failed to get widget authentication");
              }
              const { jwt: widgetJwt } = await widgetJwtResponse.json();
              const timestamp = Date.now();
              const roomName = `agent-${config.agentId}-${timestamp}`;
              log(`Generated room name: ${roomName}`);
              const tokenResponse = await fetch(config.tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agentId: config.agentId,
                  roomName,
                  jwtFromWidget: widgetJwt
                }),
                credentials: "include"
              });
              if (!tokenResponse.ok) {
                throw new Error("Failed to get connection token");
              }
              const { token, url } = await tokenResponse.json();
              livekitRoom = new LiveKit.Room({
                adaptiveStream: true,
                dynacast: true,
                // Removed invalid 'audioPreferHighQuality' option
                // Using correct lowercase 'webaudio' option (not WebAudio)
                webaudio: {
                  audioContext
                }
              });
              await livekitRoom.connect(url, token);
              livekitRoom.on("trackSubscribed", (track) => {
                attachAssistantAudio(elements, audioContext, track);
              });
              livekitRoom.remoteParticipants.forEach((participant) => {
                participant.trackPublications.forEach((publication) => {
                  if (publication.isSubscribed && publication.track) {
                    attachAssistantAudio(elements, audioContext, publication.track);
                  }
                });
                participant.on("trackSubscribed", (track) => {
                  attachAssistantAudio(elements, audioContext, track);
                });
              });
              log(`Found ${livekitRoom.remoteParticipants.size} participants already in the room`);
              log("Connected to LiveKit room using v2 API");
              try {
                await livekitRoom.startAudio();
                log("Room audio started successfully");
              } catch (err) {
                console.warn("room.startAudio() failed:", err);
                log(`Room audio start error: ${err.message}`);
                const unmuteBtn = document.createElement("button");
                unmuteBtn.textContent = "\u{1F50A} Tap to unmute";
                unmuteBtn.className = "unmute-button";
                Object.assign(unmuteBtn.style, {
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  zIndex: "999",
                  padding: "8px 12px",
                  background: "#0077ff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                });
                unmuteBtn.onclick = async () => {
                  try {
                    await livekitRoom.startAudio();
                    unmuteBtn.remove();
                  } catch (e) {
                    console.error("Failed to start audio:", e);
                  }
                };
                panel.appendChild(unmuteBtn);
              }
              isConnected = true;
              log("Connected to LiveKit room");
              if (micTrack) {
                await livekitRoom.localParticipant.publishTrack(micTrack);
                isMicActive = true;
                elements.statusIndicator.textContent = "Listening...";
                log("Microphone track published");
              } else {
                log("Warning: No microphone track available to publish");
                elements.statusIndicator.textContent = "Microphone unavailable";
              }
              livekitRoom.on("participantConnected", (participant) => {
                log(`${participant.identity} connected`);
              });
              livekitRoom.on("dataReceived", (payload, participant, kind, topic) => {
                if (topic !== "conversation")
                  return;
                let msg;
                try {
                  msg = JSON.parse(new TextDecoder().decode(payload));
                } catch (e) {
                  console.error("[Widget] Ung\xFCltiges JSON im Datenkanal:", e);
                  return;
                }
                messageBuffer.push(msg);
                messageBuffer.sort((a, b) => a.timestamp - b.timestamp);
                elements.messagesContainer.innerHTML = "";
                messageBuffer.forEach((m) => {
                  addMessage(elements, m.text, m.role === "user");
                });
                if (msg.role === "user") {
                  showThinking(elements);
                  elements.statusIndicator.textContent = "Assistant is thinking...";
                } else if (msg.role === "assistant" || msg.role === "system") {
                  const thinking = document.querySelector(".voice-saas-widget-thinking");
                  if (thinking) {
                    thinking.remove();
                  }
                  elements.statusIndicator.textContent = "Listening...";
                }
              });
            } catch (error) {
              log(`Error: ${error.message}`);
              if (error.name === "NotAllowedError") {
                elements.statusIndicator.textContent = "Microphone access denied";
                const retryBtn = document.createElement("button");
                retryBtn.textContent = "\u{1F399}\uFE0F Allow microphone access";
                retryBtn.className = "voice-saas-widget-retry-button";
                const existingRetry = panel.querySelector(".voice-saas-widget-retry-button");
                if (existingRetry)
                  existingRetry.remove();
                elements.messagesContainer.appendChild(retryBtn);
                retryBtn.addEventListener("click", async () => {
                  retryBtn.remove();
                  if (navigator.permissions && navigator.permissions.query) {
                    try {
                      const permissionStatus = await navigator.permissions.query({ name: "microphone" });
                      log(`Microphone permission status: ${permissionStatus.state}`);
                      if (permissionStatus.state === "denied") {
                        addMessage(elements, "Please enable microphone access in your browser settings and refresh the page.", false);
                        return;
                      }
                    } catch (e) {
                      log(`Error checking permissions: ${e.message}`);
                    }
                  }
                  panel.style.display = "none";
                  setTimeout(() => micButton.click(), 500);
                });
              } else if (error.message.includes("WebSocket")) {
                elements.statusIndicator.textContent = "Network error";
              } else {
                elements.statusIndicator.textContent = "Connection failed";
              }
            }
          }
        } else if (isConnected) {
          if (isMicActive) {
            if (livekitRoom) {
              livekitRoom.localParticipant.unpublishAllTracks();
              if (micTrack) {
                micTrack.stop();
                micTrack = null;
              }
              isMicActive = false;
              elements.statusIndicator.textContent = "Microphone off";
              micButton.style.background = "#999";
            }
          } else {
            try {
              elements.statusIndicator.textContent = "Requesting microphone access...";
              const LiveKit = window.LivekitClient || window.livekit;
              micTrack = await LiveKit.createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              });
              await livekitRoom.localParticipant.publishTrack(micTrack);
              isMicActive = true;
              elements.statusIndicator.textContent = "Listening...";
              micButton.style.background = config.themeColor;
            } catch (micError) {
              log(`Microphone reactivation error: ${micError.message}`);
              if (micError.name === "NotAllowedError") {
                elements.statusIndicator.textContent = "Microphone access denied";
              } else if (micError.message.includes("WebSocket")) {
                elements.statusIndicator.textContent = "Network error";
              } else {
                elements.statusIndicator.textContent = "Could not access microphone";
              }
            }
          }
        }
      });
      document.addEventListener("click", function audioUnlock() {
        if (audioContext && audioContext.state === "suspended") {
          audioContext.resume().then(() => log("AudioContext resumed by user interaction")).catch((e) => console.warn("AudioContext resume error:", e));
        }
        if (livekitRoom) {
          livekitRoom.startAudio().then(() => log("LiveKit audio started by user interaction")).catch((e) => console.warn("LiveKit startAudio error:", e));
        }
        document.removeEventListener("click", audioUnlock);
      }, { once: true });
      window.addEventListener("beforeunload", () => {
        if (micTrack) {
          micTrack.stop();
          micTrack = null;
        }
        if (livekitRoom) {
          livekitRoom.disconnect();
        }
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close().catch(() => {
          });
        }
        if (elements.audioContainer) {
          elements.audioContainer.innerHTML = "";
        }
      });
    }
    function init() {
      injectThemeStyles();
      initWidget();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
    window.VoiceSaasWidget = {
      version,
      createWidget: function(customConfig) {
        Object.assign(config, customConfig);
        injectThemeStyles();
        return initWidget();
      }
    };
  })();
})();
