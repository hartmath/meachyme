// Security utilities for the Chyme messaging platform

export class SecurityManager {
  // Sanitize user input to prevent XSS
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 10000); // Limit length
  }

  // Validate file upload
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'application/pdf',
      'text/plain'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size too large (max 50MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }

  // Rate limiting for API calls
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(userId: string, action: string, limit: number = 10, windowMs: number = 60000): boolean {
    const key = `${userId}-${action}`;
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(key);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userLimit.count >= limit) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Validate message content
  static validateMessage(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Message content is required' };
    }

    const sanitized = this.sanitizeInput(content);
    
    if (sanitized.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (sanitized.length > 5000) {
      return { valid: false, error: 'Message too long (max 5000 characters)' };
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/g, // Repeated characters
      /https?:\/\/[^\s]+/g, // URLs (basic check)
      /@\w+/g, // Mentions
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        // Allow some patterns but flag for review
        console.warn('Potential spam detected:', content.substring(0, 100));
      }
    }

    return { valid: true };
  }

  // Generate secure random ID
  static generateSecureId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Check if user is authenticated and valid
  static async validateUser(supabase: any): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { valid: false, error: 'User not authenticated' };
      }

      // Check if user email is verified
      if (!user.email_confirmed_at) {
        return { valid: false, error: 'Email not verified' };
      }

      return { valid: true, user };
    } catch (error) {
      return { valid: false, error: 'Authentication check failed' };
    }
  }

  // Content Security Policy headers
  static getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "media-src 'self' blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  // Clean up rate limit map periodically
  static cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (now > value.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

// Initialize cleanup interval
setInterval(() => {
  SecurityManager.cleanupRateLimit();
}, 5 * 60 * 1000); // Clean up every 5 minutes
