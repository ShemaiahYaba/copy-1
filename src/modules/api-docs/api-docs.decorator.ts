// src/common/decorators/api-docs.decorator.ts

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Standard response type for error messages
 */
class ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * OPTIONS FOR DOCUMENTATION
 */
interface BaseApiOptions {
  auth?: boolean; // Default: true
  tags?: string[]; // Optional additional tags
}

interface ResponseOptions extends BaseApiOptions {
  type?: Type<any>;
  isArray?: boolean;
}

/**
 * ==============================================
 * STANDARD CRUD DECORATORS
 * Use these for typical CRUD operations
 * ==============================================
 */

/**
 * GET /resource - Get all items
 * @param resource - Resource name (e.g., 'users', 'products')
 * @param responseType - DTO class for response
 * @param options - Additional options
 */
export function ApiGetAll(
  resource: string,
  responseType: Type<any>,
  options: ResponseOptions = {},
) {
  const { auth = true, isArray = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Get all ${resource}`,
      description: `Retrieve a list of all ${resource}`,
    }),
    ApiResponse({
      status: 200,
      description: 'Success',
      type: isArray ? [responseType] : responseType,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * GET /resource/:id - Get single item by ID
 * @param resource - Resource name (e.g., 'user', 'product')
 * @param responseType - DTO class for response
 */
export function ApiGetOne(
  resource: string,
  responseType: Type<any>,
  options: BaseApiOptions = {},
) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Get ${resource} by ID`,
      description: `Retrieve a single ${resource} by its ID`,
    }),
    ApiParam({
      name: 'id',
      description: `The ID of the ${resource}`,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Success',
      type: responseType,
    }),
    ApiResponse({
      status: 404,
      description: `${resource} not found`,
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * POST /resource - Create new item
 * @param resource - Resource name (e.g., 'user', 'product')
 * @param createDto - DTO class for request body
 * @param responseType - DTO class for response
 */
export function ApiCreate(
  resource: string,
  createDto: Type<any>,
  responseType: Type<any>,
  options: BaseApiOptions = {},
) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Create a new ${resource}`,
      description: `Create a new ${resource} in the system`,
    }),
    ApiBody({
      type: createDto,
      description: `${resource} data`,
    }),
    ApiResponse({
      status: 201,
      description: `${resource} created successfully`,
      type: responseType,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * PUT/PATCH /resource/:id - Update existing item
 * @param resource - Resource name (e.g., 'user', 'product')
 * @param updateDto - DTO class for request body
 * @param responseType - DTO class for response
 */
export function ApiUpdate(
  resource: string,
  updateDto: Type<any>,
  responseType: Type<any>,
  options: BaseApiOptions = {},
) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Update ${resource}`,
      description: `Update an existing ${resource}`,
    }),
    ApiParam({
      name: 'id',
      description: `The ID of the ${resource} to update`,
      type: String,
    }),
    ApiBody({
      type: updateDto,
      description: `Updated ${resource} data`,
    }),
    ApiResponse({
      status: 200,
      description: `${resource} updated successfully`,
      type: responseType,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: `${resource} not found`,
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * DELETE /resource/:id - Delete item
 * @param resource - Resource name (e.g., 'user', 'product')
 */
export function ApiDelete(resource: string, options: BaseApiOptions = {}) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Delete ${resource}`,
      description: `Delete a ${resource} from the system`,
    }),
    ApiParam({
      name: 'id',
      description: `The ID of the ${resource} to delete`,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: `${resource} deleted successfully`,
    }),
    ApiResponse({
      status: 404,
      description: `${resource} not found`,
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * ==============================================
 * PAGINATED & FILTERED QUERIES
 * ==============================================
 */

/**
 * GET /resource?page=1&limit=10 - Get paginated items
 */
export function ApiGetPaginated(
  resource: string,
  responseType: Type<any>,
  options: BaseApiOptions = {},
) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Get paginated ${resource}`,
      description: `Retrieve ${resource} with pagination support`,
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 10)',
      example: 10,
    }),
    ApiResponse({
      status: 200,
      description: 'Success',
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: `#/components/schemas/${responseType.name}` },
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number', example: 100 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 10 },
              totalPages: { type: 'number', example: 10 },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - invalid pagination parameters',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * GET /resource/search?q=term - Search items
 */
export function ApiSearch(
  resource: string,
  responseType: Type<any>,
  options: BaseApiOptions = {},
) {
  const { auth = true } = options;

  return applyDecorators(
    ApiOperation({
      summary: `Search ${resource}`,
      description: `Search for ${resource} using query parameters`,
    }),
    ApiQuery({
      name: 'q',
      required: true,
      type: String,
      description: 'Search query',
      example: 'search term',
    }),
    ApiResponse({
      status: 200,
      description: 'Success',
      type: [responseType],
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - invalid search query',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
    ...(auth ? [ApiBearerAuth()] : []),
  );
}

/**
 * ==============================================
 * CUSTOM OPERATIONS
 * Use these for non-CRUD endpoints
 * ==============================================
 */

interface CustomOperationOptions extends BaseApiOptions {
  summary: string;
  description?: string;
  successStatus?: number;
  successDescription?: string;
  responseType?: Type<any>;
  params?: Array<{ name: string; description: string; type?: any }>;
  queries?: Array<{
    name: string;
    required?: boolean;
    description: string;
    type?: any;
    example?: any;
  }>;
  body?: Type<any>;
}

/**
 * Custom operation - Use for any non-standard endpoint
 * @example
 * @ApiCustom({
 *   summary: 'Activate user account',
 *   description: 'Activates a user account by token',
 *   successStatus: 200,
 *   responseType: UserDto,
 *   params: [{ name: 'token', description: 'Activation token' }],
 * })
 */
export function ApiCustom(options: CustomOperationOptions) {
  const {
    auth = true,
    successStatus = 200,
    successDescription = 'Success',
    params = [],
    queries = [],
    body,
  } = options;

  const decorators = [
    ApiOperation({
      summary: options.summary,
      ...(options.description && { description: options.description }),
    }),
    ApiResponse({
      status: successStatus,
      description: successDescription,
      ...(options.responseType && { type: options.responseType }),
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
  ];

  // Add params
  params.forEach((param) => {
    decorators.push(
      ApiParam({
        name: param.name,
        description: param.description,
        type: param.type || String,
      }),
    );
  });

  // Add queries
  queries.forEach((query) => {
    decorators.push(
      ApiQuery({
        name: query.name,
        required: query.required !== false,
        description: query.description,
        type: query.type || String,
        ...(query.example && { example: query.example }),
      }),
    );
  });

  // Add body
  if (body) {
    decorators.push(ApiBody({ type: body }));
  }

  // Add auth
  if (auth) {
    decorators.push(ApiBearerAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * ==============================================
 * AUTHENTICATION ENDPOINTS
 * ==============================================
 */

export function ApiLogin(loginDto: Type<any>, responseType: Type<any>) {
  return applyDecorators(
    ApiOperation({
      summary: 'User login',
      description: 'Authenticate user and return access token',
    }),
    ApiBody({ type: loginDto }),
    ApiResponse({
      status: 200,
      description: 'Login successful',
      type: responseType,
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
  );
}

export function ApiRegister(registerDto: Type<any>, responseType: Type<any>) {
  return applyDecorators(
    ApiOperation({
      summary: 'User registration',
      description: 'Register a new user account',
    }),
    ApiBody({ type: registerDto }),
    ApiResponse({
      status: 201,
      description: 'Registration successful',
      type: responseType,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 409,
      description: 'User already exists',
      type: ErrorResponse,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ErrorResponse,
    }),
  );
}
