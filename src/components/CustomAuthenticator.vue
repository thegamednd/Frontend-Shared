<template>
  <div class="custom-authenticator">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Welcome to RealmForge</h1>
          <p class="auth-subtitle">Enter your realm</p>
        </div>

        <!-- Sign In Form -->
        <div v-if="authState === 'signIn'" class="auth-form">
          <form @submit.prevent="handleSignIn">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="Enter your email"
                required
                :disabled="loading"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="Enter your password"
                required
                :disabled="loading"
              />
            </div>

            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div class="auth-divider">
            <span>OR</span>
          </div>

          <button @click="handleGoogleSignIn" class="btn-google" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64,9.20454545 C17.64,8.56636364 17.5827273,7.95272727 17.4763636,7.36363636 L9,7.36363636 L9,10.845 L13.8436364,10.845 C13.635,11.97 13.0009091,12.9231818 12.0477273,13.5613636 L12.0477273,15.8195455 L14.9563636,15.8195455 C16.6581818,14.2527273 17.64,11.9454545 17.64,9.20454545 L17.64,9.20454545 Z" fill="#4285F4"/>
              <path d="M9,18 C11.43,18 13.4672727,17.1940909 14.9563636,15.8195455 L12.0477273,13.5613636 C11.2418182,14.1013636 10.2109091,14.4204545 9,14.4204545 C6.65590909,14.4204545 4.67181818,12.8372727 3.96409091,10.71 L0.957272727,10.71 L0.957272727,13.0418182 C2.43818182,15.9831818 5.48181818,18 9,18 L9,18 Z" fill="#34A853"/>
              <path d="M3.96409091,10.71 C3.78409091,10.17 3.68181818,9.59318182 3.68181818,9 C3.68181818,8.40681818 3.78409091,7.83 3.96409091,7.29 L3.96409091,4.95818182 L0.957272727,4.95818182 C0.347727273,6.17318182 0,7.54772727 0,9 C0,10.4522727 0.347727273,11.8268182 0.957272727,13.0418182 L3.96409091,10.71 L3.96409091,10.71 Z" fill="#FBBC05"/>
              <path d="M9,3.57954545 C10.3213636,3.57954545 11.5077273,4.03363636 12.4404545,4.92545455 L15.0218182,2.34409091 C13.4631818,0.891818182 11.4259091,0 9,0 C5.48181818,0 2.43818182,2.01681818 0.957272727,4.95818182 L3.96409091,7.29 C4.67181818,5.16272727 6.65590909,3.57954545 9,3.57954545 L9,3.57954545 Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div class="auth-links">
            <a href="#" @click.prevent="authState = 'forgotPassword'">Forgot password?</a>
            <span class="separator">&bull;</span>
            <a :href="registerUrl">Create account</a>
          </div>
        </div>

        <!-- Forgot Password Form -->
        <div v-else-if="authState === 'forgotPassword'" class="auth-form">
          <form @submit.prevent="handleForgotPassword">
            <p class="reset-message">
              Enter your email address and we'll send you a code to reset your password.
            </p>

            <div class="form-group">
              <label for="reset-email">Email</label>
              <input
                id="reset-email"
                v-model="resetEmail"
                type="email"
                placeholder="Enter your email"
                required
                :disabled="loading"
              />
            </div>

            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Sending...' : 'Send Reset Code' }}
            </button>
          </form>

          <div class="auth-links">
            <a href="#" @click.prevent="authState = 'signIn'">Back to sign in</a>
          </div>
        </div>

        <!-- Reset Password Form -->
        <div v-else-if="authState === 'resetPassword'" class="auth-form">
          <form @submit.prevent="handleResetPassword">
            <p class="reset-message">
              Enter the code we sent to {{ resetEmail }} and create a new password.
            </p>

            <div class="form-group">
              <label for="reset-code">Reset Code</label>
              <input
                id="reset-code"
                v-model="resetCode"
                type="text"
                placeholder="Enter reset code"
                required
                :disabled="loading"
              />
            </div>

            <div class="form-group">
              <label for="new-password">New Password</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                placeholder="Enter new password (min 8 characters)"
                minlength="8"
                required
                :disabled="loading"
              />
            </div>

            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Resetting...' : 'Reset Password' }}
            </button>
          </form>

          <div class="auth-links">
            <a href="#" @click.prevent="authState = 'signIn'">Back to sign in</a>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { signIn, signInWithRedirect, resetPassword, confirmResetPassword } from '@aws-amplify/auth';
import { useNotifications } from '@shared/composables/useNotifications';
import { emailToUsername, getUsernameFromEmail, storeEmailUsernameMapping } from '@shared/utils/authHelpers';

const emit = defineEmits(['authenticated']);
const { notifySuccess, notifyError } = useNotifications();

// Authentication state
const authState = ref('signIn');
const loading = ref(false);
const error = ref('');

// Sign In fields
const email = ref('');
const password = ref('');

// Password reset fields
const resetEmail = ref('');
const resetCode = ref('');
const newPassword = ref('');

// Register URL — redirects to RealmForge with return URL
const registerUrl = computed(() => {
  const base = import.meta.env.VITE_REGISTER_URL || 'https://dev.realmforge.io/register';
  const returnUrl = encodeURIComponent(window.location.href);
  return `${base}?redirect=${returnUrl}`;
});

// Sign In handler
const handleSignIn = async () => {
  loading.value = true;
  error.value = '';

  try {
    // First try to sign in with the email as username (for backward compatibility)
    let signInUsername = email.value;
    let signInResult;

    try {
      signInResult = await signIn({
        username: signInUsername,
        password: password.value,
      });
    } catch (firstError) {
      // If sign in with email fails, try with the converted username
      const convertedUsername = getUsernameFromEmail(email.value) || emailToUsername(email.value);

      try {
        signInResult = await signIn({
          username: convertedUsername,
          password: password.value,
        });

        // Store the mapping for future use
        storeEmailUsernameMapping(email.value, convertedUsername);
      } catch (secondError) {
        // If both attempts fail, throw the original error
        throw firstError;
      }
    }

    if (signInResult?.isSignedIn) {
      notifySuccess('Successfully signed in!');
      emit('authenticated');
    }
  } catch (err) {
    console.error('Sign in error:', err);
    error.value = err.message || 'Failed to sign in. Please check your credentials.';
    notifyError(error.value);
  } finally {
    loading.value = false;
  }
};

// Google Sign In handler
const handleGoogleSignIn = async () => {
  loading.value = true;
  error.value = '';

  try {
    await signInWithRedirect({ provider: 'Google' });
  } catch (err) {
    console.error('Google sign in error:', err);
    error.value = 'Failed to sign in with Google. Please try again.';
    notifyError(error.value);
    loading.value = false;
  }
};

// Forgot Password handler
const handleForgotPassword = async () => {
  loading.value = true;
  error.value = '';

  try {
    // Try with email first, then with converted username
    let resetResult;

    try {
      resetResult = await resetPassword({
        username: resetEmail.value,
      });
    } catch (firstError) {
      // If reset with email fails, try with the converted username
      const convertedUsername = getUsernameFromEmail(resetEmail.value) || emailToUsername(resetEmail.value);

      try {
        resetResult = await resetPassword({
          username: convertedUsername,
        });
      } catch (secondError) {
        // If both attempts fail, throw the original error
        throw firstError;
      }
    }

    if (resetResult?.nextStep?.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
      authState.value = 'resetPassword';
      notifySuccess('Reset code sent! Please check your email.');
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    error.value = err.message || 'Failed to send reset code. Please try again.';
    notifyError(error.value);
  } finally {
    loading.value = false;
  }
};

// Reset Password handler
const handleResetPassword = async () => {
  loading.value = true;
  error.value = '';

  try {
    // Try with email first, then with converted username
    let resetSuccessful = false;

    try {
      await confirmResetPassword({
        username: resetEmail.value,
        confirmationCode: resetCode.value,
        newPassword: newPassword.value,
      });
      resetSuccessful = true;
    } catch (firstError) {
      // If reset with email fails, try with the converted username
      const convertedUsername = getUsernameFromEmail(resetEmail.value) || emailToUsername(resetEmail.value);

      try {
        await confirmResetPassword({
          username: convertedUsername,
          confirmationCode: resetCode.value,
          newPassword: newPassword.value,
        });
        resetSuccessful = true;
      } catch (secondError) {
        // If both attempts fail, throw the original error
        throw firstError;
      }
    }

    if (resetSuccessful) {
      notifySuccess('Password reset successfully! You can now sign in with your new password.');
      authState.value = 'signIn';
      email.value = resetEmail.value;
    }
  } catch (err) {
    console.error('Reset password error:', err);
    error.value = err.message || 'Failed to reset password. Please try again.';
    notifyError(error.value);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.custom-authenticator {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('@/assets/granite.jpg') center center/cover;
  padding: 1rem;
}

.auth-container {
  width: 100%;
  max-width: 450px;
}

.auth-card {
  background-color: color-mix(in srgb, var(--theme-bg-surface) 95%, transparent);
  border: 2px solid var(--theme-accent);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 40px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
  animation: borderGlow 4s ease-in-out infinite;
}

@keyframes borderGlow {
  0%, 100% { border-color: var(--theme-accent); }
  50% { border-color: var(--theme-accent-muted); }
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header h1 {
  font-family: var(--theme-font-display);
  font-size: 2.5rem;
  color: var(--theme-success);
  margin: 0 0 0.5rem 0;
  text-shadow: 2px 2px 4px color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
}

.auth-subtitle {
  color: var(--theme-accent);
  font-family: var(--theme-font-fantasy);
  font-size: 1.2rem;
  margin: 0;
}

.auth-form {
  margin-top: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: var(--theme-accent);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-family: var(--theme-font-fantasy);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background-color: color-mix(in srgb, var(--theme-bg-surface) 80%, transparent);
  border: 1px solid var(--theme-accent-muted);
  border-radius: 0.5rem;
  color: var(--theme-text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--theme-accent);
  background-color: var(--theme-bg-surface);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--theme-success), #27ae60);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-family: var(--theme-font-display);
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #27ae60, #229954);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-success) 30%, transparent);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-google {
  width: 100%;
  padding: 0.875rem;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.btn-google:hover:not(:disabled) {
  background-color: #f8f8f8;
  border-color: #ccc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-divider {
  text-align: center;
  margin: 1.5rem 0;
  position: relative;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--theme-accent-muted);
}

.auth-divider span {
  position: relative;
  padding: 0 1rem;
  background-color: color-mix(in srgb, var(--theme-bg-surface) 95%, transparent);
  color: var(--theme-accent);
  font-size: 0.9rem;
  font-family: var(--theme-font-fantasy);
}

.auth-links {
  text-align: center;
  margin-top: 1.5rem;
}

.auth-links a {
  color: var(--theme-accent);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.auth-links a:hover {
  color: var(--theme-success);
  text-decoration: underline;
}

.separator {
  color: var(--theme-accent-muted);
  margin: 0 0.5rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  border-radius: 0.5rem;
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
}

.reset-message {
  color: var(--theme-text-primary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem;
  }

  .auth-header h1 {
    font-size: 2rem;
  }
}
</style>
