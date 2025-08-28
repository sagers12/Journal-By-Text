// Environment utilities and helpers
import { getEnvironmentConfig, environmentInfo } from '@/config/environment';

// Environment utilities
export const env = {
  get config() {
    return getEnvironmentConfig();
  },
  
  get info() {
    return environmentInfo.current;
  },
  
  get isDevelopment() {
    return getEnvironmentConfig().isDevelopment;
  },
  
  get isProduction() {
    return getEnvironmentConfig().isProduction;
  },
  
  get environment() {
    return getEnvironmentConfig().environment;
  }
};

// Development helpers
export const devUtils = {
  // Log environment information
  logEnvironment() {
    if (env.isDevelopment) {
      console.group('🌐 Environment Information');
      console.log('Environment:', env.environment);
      console.log('Hostname:', window.location.hostname);
      console.log('Origin:', window.location.origin);
      console.log('Supabase URL:', env.config.SUPABASE_URL);
      console.log('Is Vite Dev:', import.meta.env.DEV);
      console.groupEnd();
    }
  },
  
  // Show environment banner in development
  showEnvironmentBanner() {
    if (env.isDevelopment && !document.querySelector('.dev-environment-banner')) {
      const banner = document.createElement('div');
      banner.className = 'dev-environment-banner';
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #f59e0b, #d97706);
        color: white;
        padding: 4px 8px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      banner.textContent = `🚧 DEVELOPMENT ENVIRONMENT - ${env.config.SUPABASE_URL}`;
      
      document.body.appendChild(banner);
      
      // Add padding to body to account for banner
      document.body.style.paddingTop = '24px';
      
      // Remove banner after 10 seconds
      setTimeout(() => {
        banner.remove();
        document.body.style.paddingTop = '';
      }, 10000);
    }
  }
};

// Initialize development utilities
if (env.isDevelopment) {
  // Log environment on load
  devUtils.logEnvironment();
  
  // Show banner after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', devUtils.showEnvironmentBanner);
  } else {
    devUtils.showEnvironmentBanner();
  }
}