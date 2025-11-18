import { WebSocketGateway } from '@nestjs/websockets';
import { ErrorService } from './error.service';

@WebSocketGateway()
export class ErrorGateway {
  constructor(private readonly errorService: ErrorService) {}
}
