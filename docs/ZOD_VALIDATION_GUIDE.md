# Zod验证详细说明

## 1. 基础概念

### 什么是Zod？

Zod是一个TypeScript优先的schema声明和验证库，提供：
- 运行时类型验证
- 自动TypeScript类型推导
- 详细的错误信息
- 链式API设计

### 安装

```bash
npm install zod
```

---

## 2. 基础用法

### 2.1 简单类型验证

```typescript
import { z } from 'zod'

// 定义schema
const nameSchema = z.string()
const ageSchema = z.number()
const emailSchema = z.string().email()

// 验证数据
nameSchema.parse('张三')  // ✅ 通过
nameSchema.parse(123)     // ❌ 抛出ZodError

// 安全验证（不抛出错误）
const result = emailSchema.safeParse('test@example.com')
if (result.success) {
  console.log(result.data)  // 'test@example.com'
} else {
  console.log(result.error)  // 验证错误
}
```

### 2.2 对象验证

```typescript
// 定义用户schema
const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(2).max(20),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
})

// 类型推导
type User = z.infer<typeof userSchema>
// 等同于:
// type User = {
//   id: string
//   username: string
//   email: string
//   age?: number
//   role: 'admin' | 'user' | 'guest'
//   createdAt: Date
// }

// 验证数据
const userData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: '张三',
  email: 'zhangsan@example.com',
  role: 'user',
  createdAt: new Date(),
}

const validUser = userSchema.parse(userData)  // ✅
```

### 2.3 数组验证

```typescript
// 字符串数组
const tagsSchema = z.array(z.string())
tagsSchema.parse(['tag1', 'tag2'])  // ✅

// 对象数组
const usersSchema = z.array(userSchema)

// 非空数组
const nonEmptySchema = z.array(z.string()).nonempty()
```

---

## 3. 常用验证规则

### 3.1 字符串验证

```typescript
const stringSchemas = {
  // 基础
  basic: z.string(),

  // 长度限制
  length: z.string().min(2).max(20),
  exactLength: z.string().length(10),

  // 正则表达式
  pattern: z.string().regex(/^[A-Z]/, '必须以大写字母开头'),

  // 格式验证
  email: z.string().email('无效的邮箱格式'),
  url: z.string().url(),
  uuid: z.string().uuid(),

  // 自定义验证
  custom: z.string().refine(
    (val) => val.includes('@'),
    { message: '必须包含@符号' }
  ),

  // 转换
  trim: z.string().trim(),
  toLowerCase: z.string().toLowerCase(),
  toUpperCase: z.string().toUpperCase(),

  // 可选
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  nullish: z.string().nullish(),  // undefined | null

  // 默认值
  withDefault: z.string().default('默认值'),
}
```

### 3.2 数字验证

```typescript
const numberSchemas = {
  // 基础
  basic: z.number(),

  // 范围
  positive: z.number().positive(),
  negative: z.number().negative(),
  nonnegative: z.number().nonnegative(),  // >= 0

  min: z.number().min(0),
  max: z.number().max(100),
  range: z.number().min(0).max(100),

  // 类型
  int: z.number().int(),
  finite: z.number().finite(),
  safe: z.number().safe(),  // Number.MIN_SAFE_INTEGER 到 MAX_SAFE_INTEGER

  // 倍数
  multipleOf: z.number().multipleOf(5),  // 必须是5的倍数

  // 强制转换
  coerce: z.coerce.number(),  // '123' -> 123
}

// 使用示例
const ageSchema = z.number().int().positive().max(150)
ageSchema.parse(25)    // ✅
ageSchema.parse(-5)    // ❌ 必须是正数
ageSchema.parse(3.14)  // ❌ 必须是整数
```

### 3.3 日期验证

```typescript
const dateSchemas = {
  basic: z.date(),

  // 范围
  min: z.date().min(new Date('2020-01-01')),
  max: z.date().max(new Date()),

  // 强制转换
  coerce: z.coerce.date(),  // '2023-01-01' -> Date对象
}
```

### 3.4 布尔值验证

```typescript
const boolSchemas = {
  basic: z.boolean(),
  coerce: z.coerce.boolean(),  // 'true' -> true
}
```

### 3.5 枚举验证

```typescript
// 字符串枚举
const roleSchema = z.enum(['admin', 'user', 'guest'])
type Role = z.infer<typeof roleSchema>  // 'admin' | 'user' | 'guest'

// 原生枚举
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
const statusSchema = z.nativeEnum(Status)

// 字面量
const literalSchema = z.literal('hello')
literalSchema.parse('hello')  // ✅
literalSchema.parse('world')  // ❌
```

---

## 4. 高级用法

### 4.1 联合类型

```typescript
// 或关系
const idSchema = z.union([
  z.string().uuid(),
  z.number().int().positive(),
])

idSchema.parse('550e8400-e29b-41d4-a716-446655440000')  // ✅
idSchema.parse(123)  // ✅
idSchema.parse('abc')  // ❌
```

### 4.2 交叉类型

```typescript
// 与关系（合并）
const baseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
})

const userSchema = baseSchema.extend({
  username: z.string(),
  email: z.string().email(),
})

// 或使用intersection
const extendedSchema = baseSchema.and(z.object({
  updatedAt: z.date(),
}))
```

### 4.3 条件验证（Refinement）

```typescript
const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '两次密码不一致',
    path: ['confirmPassword'],  // 错误关联到confirmPassword字段
  }
)
```

### 4.4 转换（Transform）

```typescript
// 数据转换
const dateStringSchema = z.string().transform((str) => new Date(str))

const result = dateStringSchema.parse('2023-01-01')
// result 类型是 Date

// 链式转换
const processedSchema = z.string()
  .trim()
  .toLowerCase()
  .transform((s) => s.split(','))

processedSchema.parse('  A,B,C  ')  // ['a', 'b', 'c']
```

### 4.5 预处理（Preprocess）

```typescript
// 在验证前预处理数据
const preprocessedSchema = z.preprocess(
  (val) => String(val),  // 转换为字符串
  z.string().email()     // 然后验证email
)

preprocessedSchema.parse('test@example.com')  // ✅
preprocessedSchema.parse(123)  // 转换为'123'，然后验证失败
```

---

## 5. 在Express中使用Zod

### 5.1 创建验证中间件

```typescript
// backend/src/middlewares/validateMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '请求体验证失败',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(error)
    }
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '查询参数验证失败',
          details: error.errors,
        })
      }
      next(error)
    }
  }
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: '路径参数验证失败',
          details: error.errors,
        })
      }
      next(error)
    }
  }
}
```

### 5.2 在控制器中使用

```typescript
// backend/src/controllers/userController.ts
import { z } from 'zod'

// 定义查询参数schema
const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['admin', 'user', 'guest']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

// 定义请求体schema
const createUserBodySchema = z.object({
  username: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string()
    .min(12, '密码至少需要12个字符')
    .regex(/[A-Z]/, '密码需包含至少一个大写字母')
    .regex(/[a-z]/, '密码需包含至少一个小写字母')
    .regex(/[0-9]/, '密码需包含至少一个数字')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码需包含至少一个特殊字符'),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
})

// 定义路径参数schema
const userIdParamSchema = z.object({
  id: z.string().uuid('无效的用户ID格式'),
})

export async function getUsers(req: Request, res: Response) {
  try {
    // 验证查询参数
    const query = getUsersQuerySchema.parse(req.query)

    // 使用验证后的参数
    const users = await userService.getUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
      status: query.status,
    })

    res.json(users)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: '验证失败',
        details: error.errors,
      })
    }
    // 其他错误处理
  }
}
```

### 5.3 在路由中使用中间件

```typescript
// backend/src/routes/userRoutes.ts
import { Router } from 'express'
import { validateBody, validateQuery, validateParams } from '../middlewares/validateMiddleware'
import { getUsers, createUser, getUserById } from '../controllers/userController'

const router = Router()

// 使用验证中间件
router.get('/users',
  validateQuery(getUsersQuerySchema),
  getUsers
)

router.post('/users',
  validateBody(createUserBodySchema),
  createUser
)

router.get('/users/:id',
  validateParams(userIdParamSchema),
  getUserById
)

export default router
```

---

## 6. 实战示例

### 6.1 复杂的分页查询验证

```typescript
const paginationQuerySchema = z.object({
  // 分页参数
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // 排序参数
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // 过滤参数
  search: z.string().min(1).optional(),
  region: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),

  // 日期范围
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    // 验证日期范围
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  {
    message: '开始日期不能晚于结束日期',
    path: ['endDate'],
  }
)

// 类型推导
type PaginationQuery = z.infer<typeof paginationQuerySchema>
```

### 6.2 嵌套对象验证

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  province: z.string(),
  zipCode: z.string().regex(/^\d{6}$/, '邮政编码必须是6位数字'),
})

const distributorSchema = z.object({
  name: z.string().min(2),
  code: z.string().regex(/^[A-Z]{3}\d{4}$/, '代码格式：3个大写字母+4个数字'),
  level: z.number().int().min(1).max(4),
  region: z.string(),

  // 嵌套对象
  address: addressSchema,

  // 对象数组
  contacts: z.array(z.object({
    name: z.string(),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号'),
    email: z.string().email().optional(),
  })).min(1, '至少需要一个联系人'),

  // 可选的嵌套对象
  parent: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).optional(),
})
```

### 6.3 动态验证

```typescript
// 根据用户角色动态验证
function createUserSchema(role: 'admin' | 'user') {
  const baseSchema = z.object({
    username: z.string(),
    email: z.string().email(),
  })

  if (role === 'admin') {
    return baseSchema.extend({
      permissions: z.array(z.string()).min(1),
      department: z.string(),
    })
  }

  return baseSchema
}

// 使用
const adminSchema = createUserSchema('admin')
const userSchema = createUserSchema('user')
```

---

## 7. 错误处理

### 7.1 自定义错误消息

```typescript
const customErrorSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  age: z.number({
    required_error: '年龄是必填项',
    invalid_type_error: '年龄必须是数字',
  }).int('年龄必须是整数').positive('年龄必须是正数'),
})
```

### 7.2 错误格式化

```typescript
function formatZodError(error: ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }))
}

// 使用
try {
  schema.parse(data)
} catch (error) {
  if (error instanceof ZodError) {
    const formattedErrors = formatZodError(error)
    return res.status(400).json({ errors: formattedErrors })
  }
}
```

---

## 8. 性能优化

### 8.1 Schema复用

```typescript
// ✅ 好的做法：在模块级别定义schema（复用）
const userSchema = z.object({ /* ... */ })

export function validateUser(data: unknown) {
  return userSchema.parse(data)
}

// ❌ 不好的做法：每次都创建新schema
export function validateUser(data: unknown) {
  const schema = z.object({ /* ... */ })  // 每次都创建
  return schema.parse(data)
}
```

### 8.2 使用safeParse避免异常

```typescript
// 在性能敏感的场景使用safeParse
const result = schema.safeParse(data)

if (result.success) {
  // 使用result.data
} else {
  // 处理result.error
}
```

---

## 9. 最佳实践

### 9.1 组织Schema

```typescript
// schemas/user.schema.ts
export const userSchemas = {
  create: z.object({ /* ... */ }),
  update: z.object({ /* ... */ }).partial(),  // 所有字段可选
  query: z.object({ /* ... */ }),
  params: z.object({ id: z.string().uuid() }),
}

// 使用
import { userSchemas } from './schemas/user.schema'
router.post('/users', validateBody(userSchemas.create), createUser)
```

### 9.2 类型安全

```typescript
// 从schema推导类型
export const createUserSchema = z.object({ /* ... */ })
export type CreateUserDto = z.infer<typeof createUserSchema>

// 在服务层使用
class UserService {
  async createUser(data: CreateUserDto) {
    // data类型安全
  }
}
```

### 9.3 文档化

```typescript
const userSchema = z.object({
  username: z.string()
    .min(2, '用户名至少2个字符')
    .max(20, '用户名最多20个字符')
    .describe('用户名，用于登录'),

  email: z.string()
    .email('无效的邮箱格式')
    .describe('用户邮箱地址'),
})

// 可以使用zodToJsonSchema生成OpenAPI文档
```

---

## 10. 总结

### Zod的优势

✅ **类型安全** - 运行时+编译时双重保护
✅ **零依赖** - 轻量级
✅ **易用** - 链式API，学习曲线低
✅ **强大** - 支持复杂验证场景
✅ **TypeScript友好** - 完美的类型推导

### 何时使用Zod

- ✅ API请求参数验证
- ✅ 配置文件验证
- ✅ 表单数据验证
- ✅ 外部数据源验证
- ✅ 任何需要运行时类型检查的场景

### 参考资源

- [Zod官方文档](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [OpenAPI集成](https://github.com/asteasolutions/zod-to-openapi)
