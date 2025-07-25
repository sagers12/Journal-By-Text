import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  event_type: string;
  identifier: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
}

export const logSecurityEvent = async (event: SecurityEvent) => {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_type: event.event_type,
        identifier: event.identifier,
        details: event.details || {},
        severity: event.severity || 'low',
        user_id: event.user_id,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Security logging error:', err);
  }
};

// Client-side monitoring functions
export const monitorFailedActions = () => {
  // Monitor failed form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    if (form) {
      // Add monitoring for form security
      const formAction = form.action || window.location.href;
      
      // Check for suspicious activity patterns
      if (formAction.includes('auth') || formAction.includes('login')) {
        // This would be enhanced with actual failure detection
        console.log('Auth form submission monitored');
      }
    }
  });
};

// Rate limiting helper for client-side
export const checkClientRateLimit = (action: string, maxAttempts: number = 5): boolean => {
  const key = `rate_limit_${action}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  const stored = localStorage.getItem(key);
  const data = stored ? JSON.parse(stored) : { attempts: 0, windowStart: now };
  
  // Reset if window expired
  if (now - data.windowStart > windowMs) {
    data.attempts = 0;
    data.windowStart = now;
  }
  
  data.attempts++;
  localStorage.setItem(key, JSON.stringify(data));
  
  if (data.attempts > maxAttempts) {
    logSecurityEvent({
      event_type: 'client_rate_limit_exceeded',
      identifier: action,
      details: {
        attempts: data.attempts,
        max_attempts: maxAttempts,
        user_agent: navigator.userAgent
      },
      severity: 'medium'
    });
    return false;
  }
  
  return true;
};

// Input sanitization
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potential XSS vectors
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, maxLength)
    .trim();
    
  return sanitized;
};

// Detect suspicious patterns
export const detectSuspiciousActivity = (input: string): boolean => {
  const suspiciousPatterns = [
    /script\s*>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
};