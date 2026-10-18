/**
 * Life Vault Background Pedometer Web Worker
 *
 * Keeps background timing execution alive when app is minimized or running
 * in a background tab, preventing browser throttling of step processing.
 */

let heartbeatInterval = null;

self.onmessage = function (e) {
  const { command, intervalMs = 1000 } = e.data || {};

  if (command === 'START') {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      self.postMessage({ type: 'HEARTBEAT', timestamp: Date.now() });
    }, intervalMs);
    self.postMessage({ type: 'STARTED' });
  } else if (command === 'STOP') {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    self.postMessage({ type: 'STOPPED' });
  }
};
