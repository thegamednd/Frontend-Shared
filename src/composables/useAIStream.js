import { ref } from 'vue';
import { fetchAuthSession } from 'aws-amplify/auth';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

export function useAIStream() {
  const connectionId = ref(null);
  const isConnected = ref(false);
  const isStreaming = ref(false);

  let socket = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  let reconnectTimer = null;
  let intentionalClose = false;

  // Callback registrations
  let tokenCallback = null;
  let toolUseCallback = null;
  let completeCallback = null;
  let errorCallback = null;

  function onToken(fn) { tokenCallback = fn; }
  function onToolUse(fn) { toolUseCallback = fn; }
  function onComplete(fn) { completeCallback = fn; }
  function onError(fn) { errorCallback = fn; }

  async function getAuthToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch {
      return null;
    }
  }

  async function connect() {
    if (!WEBSOCKET_URL) {
      console.warn('WebSocket URL not configured');
      return;
    }

    intentionalClose = false;

    try {
      socket = new WebSocket(WEBSOCKET_URL);

      socket.onopen = () => {
        isConnected.value = true;
        reconnectAttempts = 0;

        // Subscribe for AI streaming
        socket.send(JSON.stringify({ action: 'ai_subscribe' }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'ai_subscribed':
              connectionId.value = message.connectionId;
              break;

            case 'ai_token':
              if (!isStreaming.value) break;
              if (tokenCallback) tokenCallback(message.text);
              break;

            case 'ai_tool_use':
              // Forward toolName plus full message details so consumers can
              // react to specific tools (e.g. propose_rule_change carries a
              // proposalId for deep-linking into the review drawer).
              if (toolUseCallback) toolUseCallback(message.toolName, message);
              break;

            case 'ai_complete':
              isStreaming.value = false;
              if (completeCallback) completeCallback(message);
              break;

            case 'ai_error':
              isStreaming.value = false;
              if (errorCallback) errorCallback(message.errorMessage || 'An error occurred');
              break;
          }
        } catch (err) {
          console.error('AI stream message parse error:', err);
        }
      };

      socket.onclose = async (event) => {
        isConnected.value = false;
        connectionId.value = null;

        if (!intentionalClose && event.code !== 1000) {
          await getAuthToken();
          attemptReconnect();
        }
      };

      socket.onerror = () => {
        isConnected.value = false;
      };
    } catch (err) {
      console.error('AI stream connection failed:', err);
      attemptReconnect();
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('AI stream: max reconnect attempts reached');
      return;
    }

    reconnectAttempts++;
    reconnectTimer = setTimeout(() => connect(), reconnectDelay);
  }

  function disconnect() {
    intentionalClose = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (socket) {
      socket.close(1000, 'Component unmounted');
      socket = null;
    }

    isConnected.value = false;
    isStreaming.value = false;
    connectionId.value = null;
  }

  function startStreaming() {
    isStreaming.value = true;
  }

  function stopStreaming() {
    isStreaming.value = false;
  }

  return {
    connectionId,
    isConnected,
    isStreaming,
    connect,
    disconnect,
    onToken,
    onToolUse,
    onComplete,
    onError,
    startStreaming,
    stopStreaming,
  };
}
