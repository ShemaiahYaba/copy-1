import { Test, TestingModule } from '@nestjs/testing';
import { ErrorGateway } from './error.gateway';
import { ErrorService } from './error.service';

describe('ErrorGateway', () => {
  let gateway: ErrorGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorGateway, ErrorService],
    }).compile();

    gateway = module.get<ErrorGateway>(ErrorGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
