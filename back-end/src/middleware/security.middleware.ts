import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Custom security logic example (helmet handles most headers globally)
    // For example, strictly demanding a custom header or checking something specific
    
    // Add custom security header
    res.setHeader('X-Custom-Security', 'Rentalworks-Secure');
    
    // Example: block specific user agents if needed
    const userAgent = req.get('user-agent') || '';
    if (userAgent.includes('curl') && req.originalUrl.includes('/admin')) {
      return res.status(403).json({ message: 'Forbidden access from this agent' });
    }
    
    next();
  }
}
