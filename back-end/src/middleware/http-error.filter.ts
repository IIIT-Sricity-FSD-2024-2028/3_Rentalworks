import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from './winston.config';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    let errorMessage: any = 'Internal server error';
    if (exceptionResponse) {
      if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
        errorMessage = exceptionResponse.message;
      } else if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      } else {
        errorMessage = exception instanceof HttpException ? exception.message : 'Error';
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
    };

    console.error('EXCEPTION IN FILTER:', exception);

    // Log the error using Winston
    logger.error(
      `${request.method} ${request.url} ${status} - Error: ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }
}
