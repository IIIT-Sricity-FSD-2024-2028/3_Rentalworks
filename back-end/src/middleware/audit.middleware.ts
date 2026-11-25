import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(
      `[Audit] ${req.method} request to router: ${req.originalUrl}`,
    );
    next();
  }
}
