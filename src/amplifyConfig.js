// Detect environment based on hostname
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

// Set redirect URLs based on environment
const getRedirectUrls = () => {
  if (isLocal) {
    const currentUrl = `${window.location.protocol}//${window.location.host}/`;
    return {
      redirectSignIn: currentUrl,
      redirectSignOut: currentUrl
    };
  }

  return {
    redirectSignIn: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN,
    redirectSignOut: import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT
  };
};

const redirectUrls = getRedirectUrls();

const amplifyConfig = {
  aws_project_region: import.meta.env.VITE_AWS_REGION,
  ...(import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID && {
    aws_cognito_identity_pool_id: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
  }),
  aws_cognito_region: import.meta.env.VITE_AWS_REGION,
  aws_user_pools_id: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    scope: [
      "email",
      "openid",
      "profile",
      "aws.cognito.signin.user.admin"
    ],
    redirectSignIn: redirectUrls.redirectSignIn,
    redirectSignOut: redirectUrls.redirectSignOut,
    responseType: "code"
  },
  federationTarget: "COGNITO_USER_POOLS",
  aws_cognito_username_attributes: ["EMAIL"],
  aws_cognito_social_providers: ["GOOGLE"],
  aws_cognito_signup_attributes: ["EMAIL", "NAME"],
  authenticationFlowType: "USER_SRP_AUTH",
  aws_cognito_mfa_configuration: "OFF",
  aws_cognito_mfa_types: ["SMS"],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_verification_mechanisms: ["EMAIL"],
  // Cookie storage for cross-subdomain SSO
  cookieStorage: {
    domain: isLocal ? 'localhost' :
            hostname.endsWith('.dev.realmforge.io') ? '.dev.realmforge.io' :
            '.realmforge.io',
    path: '/',
    expires: 365,
    sameSite: 'lax',
    secure: !isLocal
  }
};

export default amplifyConfig;
