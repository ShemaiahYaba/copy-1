import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class BusinessErrorFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {}
}
