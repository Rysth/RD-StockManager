# API Documentation

This document describes the API structure and testing approach for the Rails API backend.

## Overview

The API follows RESTful conventions and uses Rails' default testing framework (Minitest) for test coverage. The application provides JSON API endpoints for user management, business operations, and authentication.

## API Structure

### Endpoints

The API is organized under the `/api/v1/` namespace with the following main resources:

- **Authentication**: Handled by Rodauth for user registration, login, and password management
- **Users**: User management operations (`/api/v1/users`)
- **Businesses**: Business entity management (`/api/v1/businesses`)
- **Profile**: User profile operations (`/api/v1/profile`)
- **Me**: Current user information (`/api/v1/me`)

### Response Format

All API responses follow a consistent JSON structure:

```json
{
  "status": "success|error",
  "data": { ... },
  "message": "Optional message"
}
```

## Testing

### Running Tests

The application uses Rails' default Minitest framework for testing:

```bash
# Run all tests
rails test

# Run specific test files
rails test test/controllers/api/v1/users_controller_test.rb

# Run tests with Docker
docker compose exec api bundle exec rails test
```

### Test Structure

Tests are organized in the `test/` directory:

- `test/controllers/` - Controller tests for API endpoints
- `test/models/` - Model tests for business logic
- `test/fixtures/` - Test data fixtures
- `test/integration/` - Integration tests

### Writing Tests

Create controller tests that verify API functionality:

```ruby
require 'test_helper'

class Api::V1::UsersControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get api_v1_users_url
    assert_response :success
    assert_equal 'application/json', response.content_type
  end
end
```

## Development

### API Controllers

Controllers are located under `app/controllers/api/v1/` and inherit from `Api::V1::BaseController` which provides:

- Authentication handling
- Error response formatting
- Pagination support
- CORS configuration

### Authentication

The API uses Rodauth for authentication with JWT tokens. Key features:

- User registration and email verification
- Password reset functionality
- Session management
- Role-based access control

## Next Steps

1. Create comprehensive controller tests for all API endpoints
2. Add integration tests for complete user workflows
3. Implement API versioning strategy as needed
4. Add performance testing for critical endpoints
