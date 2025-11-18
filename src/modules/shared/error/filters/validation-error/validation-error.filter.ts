import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class ValidationErrorFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {}
}
