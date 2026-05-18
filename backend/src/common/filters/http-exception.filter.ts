import{
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import {Request, Response} from 'express'

// global exception filter: converts all the thrown exceptions into the standard SpendSense error shape
/**
 * {
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "timestamp": "2026-05-18T10:00:00.000Z",
 *   "path": "/api/v1/obligations"
 * }
 */

@Catch()
export class HttpExceptionFilter implements ExceptionFilter{
    catch(exception: unknown, host: ArgumentsHost){
        const ctx = host.switchToHttp()
        const request = ctx.getRequest<Request>()
        const response = ctx.getResponse<Response>()

        const statusCode = exception instanceof HttpException?
            exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

        const exceptionResponse = exception instanceof HttpException?
            exception.getResponse() : null

        const message = typeof exceptionResponse === 'object' && exceptionResponse !== null &&
            'message' in exceptionResponse? (exceptionResponse as Record<string, unknown>).message : exception instanceof Error
            ? exception.message : 'Internal server error'

        response.status(statusCode).json({
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        })
    }
}