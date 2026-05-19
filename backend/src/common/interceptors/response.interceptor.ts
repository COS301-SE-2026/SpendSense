import{
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor implements NestInterceptor{
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(map((data)=>({ data })))
    }
}