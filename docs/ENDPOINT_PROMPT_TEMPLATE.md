# Endpoint Creation Prompt Template

> Use this template when asking an AI to create new CRUD endpoints for the Carpil API.

---

## Quick Prompt

Copy and customize this prompt:

```
Create a new [ENTITY_NAME] CRUD endpoint for this Express API.

**Entity Description:**
[Describe what the entity represents and its purpose]

**Fields:**
- [field1]: [type] - [description]
- [field2]: [type] - [description]
- ...

**Endpoints needed:**
- [ ] GET /v1/[entities] - List all
- [ ] GET /v1/[entities]/:id - Get by ID
- [ ] POST /v1/[entities] - Create
- [ ] PATCH /v1/[entities]/:id - Update
- [ ] DELETE /v1/[entities]/:id - Delete
- [ ] [Any custom endpoints]

**Business Rules:**
- [Rule 1]
- [Rule 2]

**Authentication:** All endpoints require authentication (unless specified)

Follow the patterns in @docs/AI_API_FEATURE_GUIDE.md
```

---

## Full Prompt Template

````
Create a new [ENTITY_NAME] feature for the Carpil Express API.

## Entity Definition

**Name:** [EntityName] (singular, PascalCase)
**Collection:** [entities] (plural, lowercase)
**Description:** [What this entity represents]

### Fields

| Field       | Type     | Required | Description                |
|-------------|----------|----------|----------------------------|
| id          | string   | auto     | Firestore document ID      |
| [field]     | [type]   | yes/no   | [description]              |
| ownerId     | string   | yes      | User who created it        |
| createdAt   | Date     | auto     | Creation timestamp         |
| updatedAt   | Date     | auto     | Last update timestamp      |

### Enums (if any)

```typescript
enum [EntityStatus] {
  [Value1] = '[value1]',
  [Value2] = '[value2]'
}
````

## Endpoints

| Method | Path               | Auth | Body | Description |
| ------ | ------------------ | ---- | ---- | ----------- |
| GET    | /v1/[entities]     | Yes  | No   | List all    |
| GET    | /v1/[entities]/:id | Yes  | No   | Get by ID   |
| POST   | /v1/[entities]     | Yes  | Yes  | Create new  |
| PATCH  | /v1/[entities]/:id | Yes  | Yes  | Update      |
| DELETE | /v1/[entities]/:id | Yes  | No   | Soft delete |

## Business Rules

1. [Rule: e.g., "Users can only have 5 active entities"]
2. [Rule: e.g., "Only owner can update/delete"]
3. [Rule: e.g., "Cannot delete if status is 'active'"]

## Validation Rules

- [field]: [validation, e.g., "min 1, max 100"]
- [field]: [validation, e.g., "valid email format"]

## Files to Create/Modify

Create these files following @docs/AI_API_FEATURE_GUIDE.md:

1. `src/models/[entity].model.ts` - Zod schemas and types
2. `src/interfaces/repositories.interface.ts` - Add interface
3. `src/repositories/firebase/[entities].repository.ts` - Firestore implementation
4. `src/services/[entities].service.ts` - Business logic
5. `src/controllers/[entities].controller.ts` - Request handling
6. `src/routes/v1/[entities].routes.ts` - Route definitions
7. `src/config/repository.factory.ts` - Add factory method
8. `src/app/app.ts` - Wire dependencies
9. `src/routes/index.ts` - Register routes

```

---

## Example: Creating a "Vehicles" Endpoint

```

Create a new Vehicle feature for the Carpil Express API.

## Entity Definition

**Name:** Vehicle
**Collection:** vehicles
**Description:** Represents a driver's vehicle used for carpooling rides

### Fields

| Field        | Type    | Required | Description                    |
| ------------ | ------- | -------- | ------------------------------ |
| id           | string  | auto     | Firestore document ID          |
| driverId     | string  | yes      | Owner driver's user ID         |
| brand        | string  | yes      | Vehicle brand (Toyota, Honda)  |
| model        | string  | yes      | Vehicle model (Corolla, Civic) |
| year         | number  | yes      | Manufacturing year             |
| color        | string  | yes      | Vehicle color                  |
| licensePlate | string  | yes      | License plate number           |
| seats        | number  | yes      | Total passenger seats          |
| isDefault    | boolean | no       | Is the default vehicle         |
| createdAt    | Date    | auto     | Creation timestamp             |
| updatedAt    | Date    | auto     | Last update timestamp          |

## Endpoints

| Method | Path                     | Auth | Body | Description            |
| ------ | ------------------------ | ---- | ---- | ---------------------- |
| GET    | /v1/vehicles/me          | Yes  | No   | List my vehicles       |
| GET    | /v1/vehicles/:id         | Yes  | No   | Get vehicle by ID      |
| POST   | /v1/vehicles             | Yes  | Yes  | Create new vehicle     |
| PATCH  | /v1/vehicles/:id         | Yes  | Yes  | Update vehicle         |
| DELETE | /v1/vehicles/:id         | Yes  | No   | Delete vehicle         |
| POST   | /v1/vehicles/:id/default | Yes  | No   | Set as default vehicle |

## Business Rules

1. Users can have maximum 3 vehicles
2. Only the owner (driverId) can update/delete their vehicle
3. License plate must be unique per user
4. Year must be between 1990 and current year + 1
5. Seats must be between 1 and 8

## Validation Rules

- brand: min 2 characters, max 50
- model: min 1 character, max 50
- year: integer, min 1990, max current year + 1
- color: min 2 characters, max 30
- licensePlate: alphanumeric, 5-10 characters
- seats: integer, min 1, max 8

Follow the patterns in @docs/AI_API_FEATURE_GUIDE.md

```

---

## Minimal Prompt (for simple entities)

```

Create CRUD endpoints for [EntityName] following @docs/AI_API_FEATURE_GUIDE.md

Fields: [field1] (type), [field2] (type), [field3] (type)

Business rules:

- Only owner can modify
- Max [N] per user

```

---

## Tips for Better Results

1. **Be specific about fields** - Include types, required status, and constraints
2. **Define business rules** - What restrictions should the service enforce?
3. **Specify custom endpoints** - Beyond basic CRUD, what else is needed?
4. **Mention relationships** - Does this entity relate to others (rides, users)?
5. **Include validation** - What format/range constraints apply?

---

## Checklist After Creation

After the AI creates the files, verify:

- [ ] Model has Zod schemas for Entity, CreateInput, and UpdateInput
- [ ] Repository interface added to `repositories.interface.ts`
- [ ] Repository converts Firestore timestamps to Date
- [ ] Service has authorization checks (owner validation)
- [ ] Service uses HttpError with correct status codes
- [ ] Controller uses asyncHandler wrapper
- [ ] Routes use authenticate and validateBody middlewares
- [ ] Factory method added to repository.factory.ts
- [ ] Dependencies wired in app.ts
- [ ] Routes registered in routes/index.ts
- [ ] All files follow naming conventions

---

_Reference: See @docs/AI_API_FEATURE_GUIDE.md for complete patterns and examples_

```
