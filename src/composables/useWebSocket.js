import { ref, onUnmounted } from 'vue';
import { fetchAuthSession } from 'aws-amplify/auth';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

export function useWebSocket() {
  const socket = ref(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  let reconnectTimer = null;
  let currentCharacterId = null;
  let messageHandler = null;

  async function getAuthToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch {
      return null;
    }
  }

  async function connect(characterId, onMessage) {
    if (!WEBSOCKET_URL) {
      console.warn('WebSocket URL not configured');
      return;
    }

    currentCharacterId = characterId;
    messageHandler = onMessage;

    try {
      console.log('WebSocket connecting to:', WEBSOCKET_URL);
      socket.value = new WebSocket(WEBSOCKET_URL);

      socket.value.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        reconnectAttempts.value = 0;

        // Subscribe to character updates
        socket.value.send(JSON.stringify({
          action: 'subscribe',
          characterId: characterId
        }));
      };

      socket.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);

          if (message.type === 'characterUpdate' && messageHandler) {
            messageHandler(message);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      socket.value.onclose = async (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        isConnected.value = false;

        // Attempt reconnect if not intentional close
        if (event.code !== 1000 && currentCharacterId) {
          // Refresh token before attempting reconnect
          await getAuthToken();
          attemptReconnect();
        }
      };

      socket.value.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnected.value = false;
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      attemptReconnect();
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    reconnectAttempts.value++;
    console.log(`Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts.value})`);

    reconnectTimer = setTimeout(() => {
      if (currentCharacterId && messageHandler) {
        connect(currentCharacterId, messageHandler);
      }
    }, reconnectDelay);
  }

  function disconnect() {
    currentCharacterId = null;
    messageHandler = null;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (socket.value) {
      socket.value.close(1000, 'User navigated away');
      socket.value = null;
    }

    isConnected.value = false;
  }

  function unsubscribe() {
    if (socket.value && isConnected.value) {
      socket.value.send(JSON.stringify({
        action: 'unsubscribe'
      }));
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
    unsubscribe
  };
}
