// Environment utilities and helpers with fail-closed security
import { getEnvironmentConfig, environmentInfo } from '@/config/environment';

// Environment utilities with validation
export const env = {
  get config() {
    try {
      return getEnvironmentConfig();
    } catch (error) {
      console.error('❌ Environment configuration error:', error);
      throw error;
    }
  },
  
  get info() {
    return environmentInfo.current;
  },
  
  get isDevelopment() {
    return this.config.isDevelopment;
  },
  
  get isProduction() {
    return this.config.isProduction;
  },
  
  get environment() {
    return this.config.environment;
  }
};

// Development helpers with error handling
export const devUtils = {
  // Log environment information
  logEnvironment() {
    try {
      const envInfo = env.info;
      if (env.isDevelopment && envInfo.hasValidCredentials) {
        console.group('🌐 Environment Information');
        console.log('Environment:', env.environment);
        console.log('Hostname:', window.location.hostname);
        console.log('Origin:', window.location.origin);
        console.log('Supabase URL:', env.config.SUPABASE_URL);
        console.log('Is Vite Dev:', import.meta.env.DEV);
        console.groupEnd();
      } else if (!envInfo.hasValidCredentials) {
        console.error('❌ Environment configuration invalid:', envInfo.error);
      }
    } catch (error) {
      console.error('❌ Failed to log environment information:', error);
    }
  },
  
  // Show environment banner in development
  showEnvironmentBanner() {
    try {
      const envInfo = env.info;
      
      if (env.isDevelopment && envInfo.hasValidCredentials && !document.querySelector('.dev-environment-banner')) {
        const banner = document.createElement('div');
        banner.className = 'dev-environment-banner';
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(90deg, #059669, #047857);
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
      } else if (!envInfo.hasValidCredentials) {
        // Show error banner for invalid configuration
        const errorBanner = document.createElement('div');
        errorBanner.className = 'dev-environment-error-banner';
        errorBanner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(90deg, #dc2626, #b91c1c);
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          z-index: 9999;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        errorBanner.innerHTML = `❌ ENVIRONMENT ERROR: ${envInfo.error || 'Invalid configuration'}`;
        
        document.body.appendChild(errorBanner);
        document.body.style.paddingTop = '48px';
      }
    } catch (error) {
      console.error('❌ Failed to show environment banner:', error);
    }
  }
};

// Initialize development utilities with error handling
try {
  // Log environment on load
  devUtils.logEnvironment();
  
  // Show banner after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', devUtils.showEnvironmentBanner);
  } else {
    devUtils.showEnvironmentBanner();
  }
} catch (error) {
  console.error('❌ Failed to initialize environment utilities:', error);
}