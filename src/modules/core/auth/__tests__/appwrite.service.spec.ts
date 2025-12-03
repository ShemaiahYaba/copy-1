import { Test, TestingModule } from '@nestjs/testing';
import { AppwriteService } from '../services/appwrite.service';
import { Client, Account, ID } from 'node-appwrite';

// -------------------------
// MOCKS
// -------------------------
jest.mock('node-appwrite', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis(),
    })),

    Account: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      createEmailPasswordSession: jest.fn(),
      getSession: jest.fn(),
      deleteSession: jest.fn(),
      deleteSessions: jest.fn(),
      get: jest.fn(),
      updateName: jest.fn(),
      updateEmail: jest.fn(),
      updatePassword: jest.fn(),
      createRecovery: jest.fn(),
      updateRecovery: jest.fn(),
      createVerification: jest.fn(),
      updateVerification: jest.fn(),
      getPrefs: jest.fn(),
      updatePrefs: jest.fn(),
      createJWT: jest.fn(),
    })),

    ID: { unique: jest.fn(() => 'unique-id') },
  };
});

describe('AppwriteService', () => {
  let service: AppwriteService;
  let mockAccount: jest.Mocked<Account>;

  beforeEach(async () => {
    process.env.APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
    process.env.APPWRITE_PROJECT_ID = 'test-project';
    process.env.APPWRITE_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppwriteService],
    }).compile();

    service = module.get<AppwriteService>(AppwriteService);

    await service.onModuleInit();

    mockAccount = service.getAccount() as unknown as jest.Mocked<Account>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize Appwrite client', () => {
    expect(service.getClient()).toBeDefined();
  });

  it('should initialize Account instance', () => {
    expect(service.getAccount()).toBeDefined();
  });

  // -------------------------
  // createAccount
  // -------------------------
  it('should create an account successfully', async () => {
    mockAccount.create.mockResolvedValueOnce({ $id: 'user-id' } as any);

    const result = await service.createAccount(
      'test@example.com',
      'password',
      'John',
    );

    expect(ID.unique).toHaveBeenCalled();
    expect(mockAccount.create).toHaveBeenCalledWith(
      'unique-id',
      'test@example.com',
      'password',
      'John',
    );
    expect(result).toEqual({ $id: 'user-id' });
  });

  it('should throw error when createAccount fails', async () => {
    mockAccount.create.mockRejectedValueOnce(new Error('Create error'));

    await expect(service.createAccount('email', 'pass')).rejects.toThrow(
      'Create error',
    );
  });

  // -------------------------
  // Sessions
  // -------------------------
  it('should create email session', async () => {
    mockAccount.createEmailPasswordSession.mockResolvedValueOnce({
      $id: 'session-id',
    } as any);

    const result = await service.createEmailSession('test@test.com', '1234');

    expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledWith(
      'test@test.com',
      '1234',
    );

    expect(result).toEqual({ $id: 'session-id' });
  });

  it('should throw error when createEmailSession fails', async () => {
    mockAccount.createEmailPasswordSession.mockRejectedValueOnce(
      new Error('Session error'),
    );
    await expect(
      service.createEmailSession('test@test.com', '1234'),
    ).rejects.toThrow('Session error');
  });

  it('should get a session', async () => {
    const mockSession = {
      $id: 'session-1',
      userId: 'user-1',
      expire: new Date().toISOString(),
      current: true,
    };

    mockAccount.getSession.mockResolvedValueOnce(mockSession as any);

    const result = await service.getSession('session-1');

    expect(mockAccount.getSession).toHaveBeenCalledWith('session-1');
    expect(result).toEqual(mockSession);
  });

  it('should delete a session', async () => {
    const sessionId = 'session-1';
    mockAccount.deleteSession.mockImplementationOnce(
      (): Promise<{}> => Promise.resolve({}),
    );

    await service.deleteSession(sessionId);

    expect(mockAccount.deleteSession).toHaveBeenCalledWith(sessionId);
  });

  // -------------------------
  // CRUD: User Info
  // -------------------------
  it('should get current user', async () => {
    mockAccount.get.mockResolvedValueOnce({ name: 'John' } as any);

    const result = await service.getCurrentUser();

    expect(mockAccount.get).toHaveBeenCalled();
    expect(result).toEqual({ name: 'John' });
  });

  it('should update name', async () => {
    mockAccount.updateName.mockResolvedValueOnce({ name: 'NewName' } as any);

    const result = await service.updateName('NewName');

    expect(mockAccount.updateName).toHaveBeenCalledWith('NewName');
    expect(result).toEqual({ name: 'NewName' });
  });

  it('should update email', async () => {
    mockAccount.updateEmail.mockResolvedValueOnce({
      email: 'new@test.com',
    } as any);

    const result = await service.updateEmail('new@test.com', 'password');

    expect(mockAccount.updateEmail).toHaveBeenCalledWith(
      'new@test.com',
      'password',
    );

    expect(result).toEqual({ email: 'new@test.com' });
  });

  it('should update password', async () => {
    mockAccount.updatePassword.mockResolvedValueOnce({
      updated: true,
    } as any);

    const result = await service.updatePassword('1234', 'old');

    expect(mockAccount.updatePassword).toHaveBeenCalledWith('1234', 'old');
    expect(result).toEqual({ updated: true });
  });

  // -------------------------
  // Recovery / Verification
  // -------------------------
  it('should create recovery', async () => {
    mockAccount.createRecovery.mockResolvedValueOnce({ ok: true } as any);

    const result = await service.createRecovery('test@test.com', 'url');

    expect(mockAccount.createRecovery).toHaveBeenCalledWith(
      'test@test.com',
      'url',
    );

    expect(result).toEqual({ ok: true });
  });

  it('should update recovery', async () => {
    mockAccount.updateRecovery.mockResolvedValueOnce({ ok: true } as any);

    const result = await service.updateRecovery('u1', 'secret', 'new-pass');

    expect(mockAccount.updateRecovery).toHaveBeenCalledWith(
      'u1',
      'secret',
      'new-pass',
    );

    expect(result).toEqual({ ok: true });
  });

  it('should create verification token', async () => {
    mockAccount.createVerification.mockResolvedValueOnce({ ok: true } as any);

    const result = await service.createVerification('url');
    expect(mockAccount.createVerification).toHaveBeenCalledWith('url');
    expect(result).toEqual({ ok: true });
  });

  it('should update verification', async () => {
    mockAccount.updateVerification.mockResolvedValueOnce({ ok: true } as any);

    const result = await service.updateVerification('u1', 'secret');

    expect(mockAccount.updateVerification).toHaveBeenCalledWith('u1', 'secret');
    expect(result).toEqual({ ok: true });
  });

  // -------------------------
  // Preferences
  // -------------------------
  it('should get preferences', async () => {
    mockAccount.getPrefs.mockResolvedValueOnce({ theme: 'dark' } as any);

    const result = await service.getPreferences();

    expect(mockAccount.getPrefs).toHaveBeenCalled();
    expect(result).toEqual({ theme: 'dark' });
  });

  it('should update preferences', async () => {
    mockAccount.updatePrefs.mockResolvedValueOnce({ ok: true } as any);

    const result = await service.updatePreferences({ theme: 'light' });

    expect(mockAccount.updatePrefs).toHaveBeenCalledWith({ theme: 'light' });
    expect(result).toEqual({ ok: true });
  });

  // -------------------------
  // JWT
  // -------------------------
  it('should create JWT', async () => {
    mockAccount.createJWT.mockResolvedValueOnce({ jwt: 'token' } as any);

    const result = await service.createJWT();

    expect(mockAccount.createJWT).toHaveBeenCalled();
    expect(result).toEqual({ jwt: 'token' });
  });
});
