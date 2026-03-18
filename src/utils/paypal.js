/**
 * PayPal SDK utility for Vue 3 integration
 * Handles loading and initializing PayPal JavaScript SDK
 */

let paypalScriptPromise = null;

/**
 * Load PayPal SDK script dynamically
 * @param {Object} options - PayPal SDK configuration options
 * @param {string} options.clientId - PayPal client ID
 * @param {string} options.currency - Currency code (default: USD)
 * @param {boolean} options.vault - Enable vaulting for subscriptions (default: true)
 * @param {string} options.intent - Payment intent (default: subscription)
 * @param {boolean} options.debug - Enable debug mode (default: false)
 * @returns {Promise} Promise that resolves when PayPal SDK is loaded
 */
export const loadPayPalScript = (options = {}) => {
  // Return existing promise if script is already loading/loaded
  if (paypalScriptPromise) {
    return paypalScriptPromise;
  }

  const {
    clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency = 'USD',
    vault = true,
    intent = 'subscription',
    debug = import.meta.env.VITE_PAYPAL_DEBUG === 'true'
  } = options;

  if (!clientId) {
    return Promise.reject(new Error('PayPal client ID is required'));
  }

  paypalScriptPromise = new Promise((resolve, reject) => {
    // Check if PayPal is already loaded
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    
    // Build PayPal SDK URL with parameters
    const params = new URLSearchParams({
      'client-id': clientId,
      currency,
      vault: vault.toString(),
      intent,
      ...(debug && { debug: 'true' })
    });
    
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;

    // Handle script load success
    script.onload = () => {
      if (window.paypal) {
        console.log('✅ PayPal SDK loaded successfully');
        resolve(window.paypal);
      } else {
        const error = new Error('PayPal SDK failed to load properly');
        console.error('❌', error.message);
        reject(error);
      }
    };

    // Handle script load error
    script.onerror = () => {
      const error = new Error('Failed to load PayPal SDK script');
      console.error('❌', error.message);
      reject(error);
    };

    // Add script to document head
    document.head.appendChild(script);
  });

  return paypalScriptPromise;
};

/**
 * Reset PayPal script promise (useful for testing or re-initialization)
 */
export const resetPayPalScript = () => {
  paypalScriptPromise = null;
  
  // Remove existing PayPal script if present
  const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Clear PayPal global
  if (window.paypal) {
    delete window.paypal;
  }
};

/**
 * Check if PayPal SDK is loaded and available
 * @returns {boolean} True if PayPal SDK is available
 */
export const isPayPalLoaded = () => {
  return !!(window.paypal && window.paypal.Buttons);
};

/**
 * PayPal subscription button configuration helper
 * @param {Object} config - Button configuration
 * @param {string} config.planId - PayPal subscription plan ID
 * @param {string} config.startTime - ISO timestamp for future billing start date (for billing cycle sync)
 * @param {Object} config.setupFee - Setup fee for prorated first payment
 * @param {string} config.setupFee.value - Setup fee amount (e.g., "2.50")
 * @param {string} config.setupFee.currency_code - Currency code (default: "USD")
 * @param {Function} config.onApprove - Callback for successful approval
 * @param {Function} config.onError - Callback for errors
 * @param {Function} config.onCancel - Callback for cancellation
 * @returns {Object} PayPal button configuration
 */
export const createSubscriptionButtonConfig = (config = {}) => {
  const {
    planId,
    startTime,
    setupFee,
    onApprove,
    onError,
    onCancel,
    style = {}
  } = config;

  if (!planId) {
    throw new Error('PayPal plan ID is required for subscription button');
  }

  return {
    style: {
      shape: 'rect',
      color: 'gold',
      layout: 'horizontal',
      label: 'subscribe',
      tagline: false,
      ...style
    },
    createSubscription: (data, actions) => {
      // Build subscription parameters
      const subscriptionParams = {
        plan_id: planId
      };

      // Add start_time for billing cycle synchronization
      if (startTime) {
        subscriptionParams.start_time = startTime;
        console.log('PayPal subscription start_time set to:', startTime);
      }

      // Add setup_fee for prorated first payment
      if (setupFee && setupFee.value) {
        subscriptionParams.application_context = {
          ...subscriptionParams.application_context,
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          }
        };
        // Note: setup_fee is typically configured in the plan itself
        // For dynamic setup fees, we may need to use a different approach
        console.log('PayPal subscription setup_fee:', setupFee);
      }

      return actions.subscription.create(subscriptionParams);
    },
    onApprove: async (data, actions) => {
      console.log('PayPal subscription approved:', data);
      
      if (onApprove) {
        try {
          await onApprove(data, actions);
        } catch (error) {
          console.error('Error in onApprove callback:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    },
    onCancel: (data) => {
      console.log('PayPal subscription cancelled:', data);
      if (onCancel) {
        onCancel(data);
      }
    },
    onError: (err) => {
      console.error('PayPal subscription error:', err);
      if (onError) {
        onError(err);
      }
    }
  };
};

/**
 * Format PayPal subscription ID for display
 * @param {string} subscriptionId - PayPal subscription ID
 * @returns {string} Formatted subscription ID
 */
export const formatSubscriptionId = (subscriptionId) => {
  if (!subscriptionId) return '';
  
  // PayPal subscription IDs are typically long, show first 8 and last 4 characters
  if (subscriptionId.length > 12) {
    return `${subscriptionId.substring(0, 8)}...${subscriptionId.substring(subscriptionId.length - 4)}`;
  }
  
  return subscriptionId;
};