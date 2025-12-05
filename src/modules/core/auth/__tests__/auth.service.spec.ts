// // src/modules/auth/__tests__/auth.service.spec.ts
// import { Test, TestingModule } from '@nestjs/testing';
// import { AuthService } from '../auth.service';
// import { AppwriteService } from '../services/supabase.service';
// import { UserService } from '../services/user.service';
// import { ContextService } from '@shared/context/context.service';
// import { NotificationService } from '@shared/notification/notification.service';
// import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
// import { AppError } from '@shared/error/classes/app-error.class';
// import { NotificationType } from '@shared/notification/interfaces';
// import { Models } from 'node-appwrite';

// describe('AuthService', () => {
//   let service: AuthService;
//   let appwriteService: jest.Mocked<AppwriteService>;
//   let userService: jest.Mocked<UserService>;
//   let contextService: jest.Mocked<ContextService>;
//   let notificationService: jest.Mocked<NotificationService>;

//   const mockAppwriteUser: Partial<Models.User<Models.Preferences>> = {
//     $id: 'appwrite-user-123',
//     email: 'test@test.com',
//     name: 'Test User',
//     emailVerification: false,
//   };

//   const mockSession: Partial<Models.Session> = {
//     $id: 'session-123',
//     userId: 'appwrite-user-123',
//     expire: '2025-12-01T00:00:00.000Z',
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         AuthService,
//         {
//           provide: AppwriteService,
//           useValue: {
//             createAccount: jest.fn(),
//             createEmailSession: jest.fn(),
//             deleteSession: jest.fn(),
//             deleteAllSessions: jest.fn(),
//             getSession: jest.fn(),
//           },
//         },
//         {
//           provide: UserService,
//           useValue: {
//             findByEmail: jest.fn(),
//             findById: jest.fn(),
//             findByAppwriteId: jest.fn(),
//             createClient: jest.fn(),
//             createSupervisor: jest.fn(),
//             createStudent: jest.fn(),
//             createUniversity: jest.fn(),
//             getUserWithProfile: jest.fn(),
//           },
//         },
//         {
//           provide: ContextService,
//           useValue: {
//             setMeta: jest.fn(),
//           },
//         },
//         {
//           provide: NotificationService,
//           useValue: {
//             push: jest.fn().mockResolvedValue({}),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<AuthService>(AuthService);
//     appwriteService = module.get(AppwriteService);
//     userService = module.get(UserService);
//     contextService = module.get(ContextService);
//     notificationService = module.get(NotificationService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('registerClient', () => {
//     const dto = {
//       email: 'test@company.com',
//       password: 'SecurePass123!',
//       organizationName: 'Test Corp',
//       industry: 'Technology',
//     };

//     it('should register new client successfully', async () => {
//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockResolvedValue(mockAppwriteUser as any);
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.createClient.mockResolvedValue({
//         user: {
//           id: mockAppwriteUser.$id!,
//           appwriteId: mockAppwriteUser.$id!,
//           email: dto.email,
//           name: dto.organizationName,
//           role: 'client',
//           isActive: true,
//           emailVerified: false,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//         client: {
//           id: 'client-123',
//           userId: mockAppwriteUser.$id!,
//           organizationName: dto.organizationName,
//           industry: dto.industry,
//           orgDocumentUrl: null,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });

//       const result = await service.registerClient(dto);

//       expect(result.user.email).toBe(dto.email);
//       expect(result.user.role).toBe('client');
//       expect(result.session.sessionId).toBe(mockSession.$id);
//       expect(result.profile).toMatchObject({
//         organizationName: dto.organizationName,
//       });

//       expect(appwriteService.createAccount).toHaveBeenCalledWith(
//         dto.email,
//         dto.password,
//         dto.organizationName,
//       );
//       expect(appwriteService.createEmailSession).toHaveBeenCalledWith(
//         dto.email,
//         dto.password,
//       );
//       expect(contextService.setMeta).toHaveBeenCalled();
//       expect(notificationService.push).toHaveBeenCalledWith({
//         type: NotificationType.SUCCESS,
//         message: expect.stringContaining('Account created'),
//         context: expect.any(Object),
//       });
//     });

//     it('should throw error if email already exists in database', async () => {
//       userService.findByEmail.mockResolvedValue({
//         id: 'existing-user',
//         appwriteId: 'appwrite-123',
//         email: dto.email,
//         name: 'Existing',
//         role: 'client',
//         isActive: true,
//         emailVerified: false,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });

//       await expect(service.registerClient(dto)).rejects.toThrow(AppError);
//       await expect(service.registerClient(dto)).rejects.toMatchObject({
//         code: ERROR_CODES.ALREADY_EXISTS,
//       });

//       expect(appwriteService.createAccount).not.toHaveBeenCalled();
//     });

//     it('should handle Appwrite duplicate email error', async () => {
//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockRejectedValue({
//         code: 409,
//         message: 'User already exists',
//       });

//       await expect(service.registerClient(dto)).rejects.toThrow(AppError);
//       await expect(service.registerClient(dto)).rejects.toMatchObject({
//         code: ERROR_CODES.ALREADY_EXISTS,
//       });
//     });

//     it('should handle Appwrite server errors', async () => {
//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockRejectedValue({
//         code: 500,
//         message: 'Internal server error',
//       });

//       await expect(service.registerClient(dto)).rejects.toThrow(AppError);
//     });
//   });

//   describe('registerSupervisor', () => {
//     it('should register supervisor with valid university', async () => {
//       const dto = {
//         email: 'supervisor@uni.edu',
//         password: 'SecurePass123!',
//         universityId: 'uni-123',
//       };

//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockResolvedValue(mockAppwriteUser as any);
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.createSupervisor.mockResolvedValue({
//         user: {
//           id: mockAppwriteUser.$id,
//           appwriteId: mockAppwriteUser.$id,
//           email: dto.email,
//           role: 'supervisor',
//         } as any,
//         supervisor: {
//           id: 'sup-123',
//           universityId: dto.universityId,
//           employmentStatus: 'employed',
//         } as any,
//       });

//       const result = await service.registerSupervisor(dto);

//       expect(result.user.role).toBe('supervisor');
//       expect(result.profile).toMatchObject({
//         universityId: dto.universityId,
//       });
//       expect(appwriteService.createAccount).toHaveBeenCalled();
//     });

//     it('should throw error if university not found', async () => {
//       const dto = {
//         email: 'test@test.com',
//         password: 'Pass123!',
//         universityId: 'invalid-uni',
//       };

//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockResolvedValue(mockAppwriteUser as any);
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.createSupervisor.mockRejectedValue(
//         new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'University not found'),
//       );

//       await expect(service.registerSupervisor(dto)).rejects.toThrow(AppError);
//     });
//   });

//   describe('registerStudent', () => {
//     it('should register student successfully', async () => {
//       const dto = {
//         email: 'student@test.com',
//         password: 'SecurePass123!',
//         matricNumber: 'MAT2021/001',
//         skills: ['JavaScript', 'React'],
//       };

//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockResolvedValue(mockAppwriteUser as any);
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.createStudent.mockResolvedValue({
//         user: {
//           id: mockAppwriteUser.$id,
//           appwriteId: mockAppwriteUser.$id,
//           email: dto.email,
//           role: 'student',
//         } as any,
//         student: {
//           id: 'student-123',
//           matricNumber: dto.matricNumber,
//           skills: dto.skills,
//           graduationStatus: 'active',
//         } as any,
//       });

//       const result = await service.registerStudent(dto);

//       expect(result.user.role).toBe('student');
//       expect(result.profile).toMatchObject({
//         matricNumber: dto.matricNumber,
//         skills: dto.skills,
//       });
//     });
//   });

//   describe('registerUniversity', () => {
//     it('should register university successfully', async () => {
//       const dto = {
//         email: 'uni@test.com',
//         password: 'SecurePass123!',
//         name: 'Test University',
//         location: 'Lagos',
//       };

//       userService.findByEmail.mockResolvedValue(null);
//       appwriteService.createAccount.mockResolvedValue(mockAppwriteUser as any);
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.createUniversity.mockResolvedValue({
//         user: {
//           id: mockAppwriteUser.$id,
//           appwriteId: mockAppwriteUser.$id,
//           email: dto.email,
//           role: 'university',
//         } as any,
//         university: {
//           id: 'uni-123',
//           name: dto.name,
//           location: dto.location,
//           isVerified: false,
//         } as any,
//       });

//       const result = await service.registerUniversity(dto);

//       expect(result.user.role).toBe('university');
//       expect(result.profile).toMatchObject({
//         name: dto.name,
//         location: dto.location,
//       });
//     });
//   });

//   describe('login', () => {
//     const dto = {
//       email: 'test@test.com',
//       password: 'SecurePass123!',
//     };

//     const mockUser = {
//       id: 'user-123',
//       appwriteId: 'appwrite-user-123',
//       email: dto.email,
//       name: 'Test User',
//       role: 'client' as const,
//       isActive: true,
//       emailVerified: false,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     it('should login with valid credentials', async () => {
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.findByAppwriteId.mockResolvedValue(mockUser);
//       userService.getUserWithProfile.mockResolvedValue({
//         user: mockUser,
//         profile: { id: 'client-123', organizationName: 'Test Corp' },
//       });

//       const result = await service.login(dto);

//       expect(result.user.email).toBe(dto.email);
//       expect(result.session.sessionId).toBe(mockSession.$id);
//       expect(contextService.setMeta).toHaveBeenCalledWith(
//         expect.objectContaining({
//           userId: mockUser.id,
//           email: mockUser.email,
//         }),
//       );
//       expect(notificationService.push).toHaveBeenCalledWith({
//         type: NotificationType.SUCCESS,
//         message: expect.stringContaining('Welcome back'),
//         context: expect.any(Object),
//       });
//     });

//     it('should throw error for invalid credentials', async () => {
//       appwriteService.createEmailSession.mockRejectedValue({
//         code: 401,
//         message: 'Invalid credentials',
//       });

//       await expect(service.login(dto)).rejects.toThrow(AppError);
//       expect(notificationService.push).toHaveBeenCalledWith({
//         type: NotificationType.ERROR,
//         message: expect.stringContaining('Login failed'),
//         context: { email: dto.email },
//       });
//     });

//     it('should throw error if user not found in database', async () => {
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.findByAppwriteId.mockResolvedValue(null);

//       await expect(service.login(dto)).rejects.toThrow(AppError);
//       await expect(service.login(dto)).rejects.toMatchObject({
//         code: ERROR_CODES.RESOURCE_NOT_FOUND,
//       });
//     });

//     it('should throw error for inactive account', async () => {
//       appwriteService.createEmailSession.mockResolvedValue(mockSession as any);
//       userService.findByAppwriteId.mockResolvedValue({
//         ...mockUser,
//         isActive: false,
//       });

//       await expect(service.login(dto)).rejects.toThrow(AppError);
//       await expect(service.login(dto)).rejects.toMatchObject({
//         code: ERROR_CODES.OPERATION_NOT_ALLOWED,
//       });
//       expect(appwriteService.deleteSession).toHaveBeenCalledWith(
//         mockSession.$id,
//       );
//     });
//   });

//   describe('logout', () => {
//     it('should logout successfully', async () => {
//       const sessionId = 'session-123';
//       const userId = 'user-123';

//       appwriteService.deleteSession.mockResolvedValue();

//       await service.logout(sessionId, userId);

//       expect(appwriteService.deleteSession).toHaveBeenCalledWith(sessionId);
//       expect(notificationService.push).toHaveBeenCalledWith({
//         type: NotificationType.INFO,
//         message: expect.stringContaining('logged out'),
//         context: { userId },
//       });
//     });

//     it('should handle logout errors', async () => {
//       const sessionId = 'session-123';

//       appwriteService.deleteSession.mockRejectedValue(
//         new Error('Logout failed'),
//       );

//       await expect(service.logout(sessionId)).rejects.toThrow(AppError);
//     });
//   });

//   describe('verifySession', () => {
//     it('should verify valid session', async () => {
//       const sessionId = 'session-123';
//       const mockUser = {
//         id: 'user-123',
//         appwriteId: 'appwrite-123',
//         email: 'test@test.com',
//         role: 'client',
//       };

//       appwriteService.getSession.mockResolvedValue(mockSession as any);
//       userService.findByAppwriteId.mockResolvedValue(mockUser as any);

//       const result = await service.verifySession(sessionId);

//       expect(result.user).toEqual(mockUser);
//       expect(result.session).toEqual(mockSession);
//       expect(appwriteService.getSession).toHaveBeenCalledWith(sessionId);
//     });

//     it('should throw error for invalid session', async () => {
//       const sessionId = 'invalid-session';

//       appwriteService.getSession.mockRejectedValue(
//         new Error('Invalid session'),
//       );

//       await expect(service.verifySession(sessionId)).rejects.toThrow(AppError);
//       await expect(service.verifySession(sessionId)).rejects.toMatchObject({
//         code: ERROR_CODES.UNAUTHORIZED,
//       });
//     });

//     it('should throw error if user not found', async () => {
//       const sessionId = 'session-123';

//       appwriteService.getSession.mockResolvedValue(mockSession as any);
//       userService.findByAppwriteId.mockResolvedValue(null);

//       await expect(service.verifySession(sessionId)).rejects.toThrow(AppError);
//       await expect(service.verifySession(sessionId)).rejects.toMatchObject({
//         code: ERROR_CODES.RESOURCE_NOT_FOUND,
//       });
//     });
//   });

//   describe('getCurrentSession', () => {
//     it('should get current session', async () => {
//       const sessionId = 'session-123';

//       appwriteService.getSession.mockResolvedValue(mockSession as any);

//       const result = await service.getCurrentSession(sessionId);

//       expect(result).toEqual(mockSession);
//       expect(appwriteService.getSession).toHaveBeenCalledWith(sessionId);
//     });

//     it('should throw error for invalid session', async () => {
//       const sessionId = 'invalid-session';

//       appwriteService.getSession.mockRejectedValue(
//         new Error('Session not found'),
//       );

//       await expect(service.getCurrentSession(sessionId)).rejects.toThrow(
//         AppError,
//       );
//     });
//   });
// });
