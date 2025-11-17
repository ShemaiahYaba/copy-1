# API Documentation Guide

## 📋 Quick Start Checklist

When you finish a module, follow these 3 steps:

1. ✅ Add `@ApiTags()` to your controller
2. ✅ Add `@ApiProperty()` to all DTO fields
3. ✅ Use the appropriate decorator on each endpoint method

---

## 🎯 Standard Pattern for CRUD Controllers

### Step 1: Import the decorators

```typescript
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetAll,
  ApiGetOne,
  ApiCreate,
  ApiUpdate,
  ApiDelete,
} from '@common/decorators/api-docs.decorator';
```

### Step 2: Tag your controller

```typescript
@ApiTags('users') // Use plural form for the resource
@Controller('users')
export class UsersController {
  // ...
}
```

### Step 3: Add decorators to methods

```typescript
@Get()
@ApiGetAll('users', UserResponseDto)
findAll() { }

@Get(':id')
@ApiGetOne('user', UserResponseDto)
findOne(@Param('id') id: string) { }

@Post()
@ApiCreate('user', CreateUserDto, UserResponseDto)
create(@Body() createDto: CreateUserDto) { }

@Put(':id')
@ApiUpdate('user', UpdateUserDto, UserResponseDto)
update(@Param('id') id: string, @Body() updateDto: UpdateUserDto) { }

@Delete(':id')
@ApiDelete('user')
remove(@Param('id') id: string) { }
```

---

## 📝 Complete Example

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiGetAll,
  ApiGetOne,
  ApiCreate,
  ApiUpdate,
  ApiDelete,
} from '@common/decorators/api-docs.decorator';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiGetAll('users', UserResponseDto)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiGetOne('user', UserResponseDto)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiCreate('user', CreateUserDto, UserResponseDto)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiUpdate('user', UpdateUserDto, UserResponseDto)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiDelete('user')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

---

## 🔍 DTOs - Document Your Fields

Always add `@ApiProperty()` to your DTO fields:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
```

---

## 🔐 Authentication

### For endpoints that DON'T require auth:

```typescript
@Get('public')
@ApiGetAll('users', UserResponseDto, { auth: false })
findPublicUsers() { }
```

### For login/register endpoints:

```typescript
import { ApiLogin, ApiRegister } from '@common/decorators/api-docs.decorator';

@Post('login')
@ApiLogin(LoginDto, AuthResponseDto)
login(@Body() loginDto: LoginDto) { }

@Post('register')
@ApiRegister(RegisterDto, AuthResponseDto)
register(@Body() registerDto: RegisterDto) { }
```

---

## 📄 Pagination

For endpoints that return paginated data:

```typescript
import { ApiGetPaginated } from '@common/decorators/api-docs.decorator';

@Get()
@ApiGetPaginated('products', ProductResponseDto)
findAll(@Query('page') page: number, @Query('limit') limit: number) {
  return this.productsService.findAllPaginated(page, limit);
}
```

---

## 🔎 Search Endpoints

```typescript
import { ApiSearch } from '@common/decorators/api-docs.decorator';

@Get('search')
@ApiSearch('products', ProductResponseDto)
search(@Query('q') query: string) {
  return this.productsService.search(query);
}
```

---

## ⚡ Custom/Non-CRUD Endpoints

For any endpoint that doesn't fit the standard CRUD pattern:

```typescript
import { ApiCustom } from '@common/decorators/api-docs.decorator';

@Post('users/:id/activate')
@ApiCustom({
  summary: 'Activate user account',
  description: 'Activates a user account and sends welcome email',
  successStatus: 200,
  responseType: UserResponseDto,
  params: [{ name: 'id', description: 'User ID' }],
})
activateUser(@Param('id') id: string) { }

@Get('users/:id/orders')
@ApiCustom({
  summary: 'Get user orders',
  description: 'Retrieve all orders for a specific user',
  responseType: OrderResponseDto,
  params: [{ name: 'id', description: 'User ID' }],
  queries: [
    { name: 'status', required: false, description: 'Filter by order status', example: 'pending' },
  ],
})
getUserOrders(@Param('id') id: string, @Query('status') status?: string) { }
```

---

## 🎨 Naming Conventions

| Decorator    | Resource Name | Example                             |
| ------------ | ------------- | ----------------------------------- |
| `@ApiGetAll` | Plural        | `'users'`, `'products'`, `'orders'` |
| `@ApiGetOne` | Singular      | `'user'`, `'product'`, `'order'`    |
| `@ApiCreate` | Singular      | `'user'`, `'product'`, `'order'`    |
| `@ApiUpdate` | Singular      | `'user'`, `'product'`, `'order'`    |
| `@ApiDelete` | Singular      | `'user'`, `'product'`, `'order'`    |

---

## ❓ Common Questions

### Q: What if my endpoint returns a different status code?

Use `@ApiCustom()` and specify the `successStatus`:

```typescript
@Post()
@ApiCustom({
  summary: 'Create batch users',
  successStatus: 202, // Accepted
  responseType: BatchResponseDto,
  body: CreateBatchUsersDto,
})
createBatch(@Body() dto: CreateBatchUsersDto) { }
```

### Q: What if I need to document query parameters?

Use `@ApiGetPaginated()` for pagination or `@ApiCustom()` for custom queries:

```typescript
@Get()
@ApiCustom({
  summary: 'Get filtered users',
  responseType: UserResponseDto,
  queries: [
    { name: 'role', required: false, description: 'Filter by role', example: 'admin' },
    { name: 'active', required: false, description: 'Filter by active status', type: Boolean },
  ],
})
findFiltered(@Query('role') role?: string, @Query('active') active?: boolean) { }
```

### Q: What about file uploads?

Use `@ApiCustom()` with `@ApiConsumes()`:

```typescript
import { ApiConsumes } from '@nestjs/swagger';

@Post('upload')
@ApiConsumes('multipart/form-data')
@ApiCustom({
  summary: 'Upload user avatar',
  responseType: UserResponseDto,
  body: FileUploadDto,
})
uploadAvatar(@UploadedFile() file: Express.Multer.File) { }
```

---

## ✅ Final Checklist

Before committing your code:

- [ ] Controller has `@ApiTags()`
- [ ] All DTOs have `@ApiProperty()` on fields
- [ ] All endpoints have appropriate decorator
- [ ] Resource names follow singular/plural convention
- [ ] Custom endpoints use `@ApiCustom()` properly
- [ ] Tested in Swagger UI at `/api`

---

## 📚 Available Decorators Reference

### CRUD Operations

- `@ApiGetAll(resource, responseDto, options?)` - GET all items
- `@ApiGetOne(resource, responseDto, options?)` - GET single item
- `@ApiCreate(resource, createDto, responseDto, options?)` - POST new item
- `@ApiUpdate(resource, updateDto, responseDto, options?)` - PUT/PATCH item
- `@ApiDelete(resource, options?)` - DELETE item

### Specialized

- `@ApiGetPaginated(resource, responseDto, options?)` - GET with pagination
- `@ApiSearch(resource, responseDto, options?)` - GET search results
- `@ApiLogin(loginDto, responseDto)` - POST login
- `@ApiRegister(registerDto, responseDto)` - POST register

### Custom

- `@ApiCustom(options)` - For anything else

---

## 🎯 Need Help?

- View examples in `/api` (Swagger UI)
- Check the decorator file: `src/common/decorators/api-docs.decorator.ts`
- Ask the team lead if you're unsure which decorator to use
