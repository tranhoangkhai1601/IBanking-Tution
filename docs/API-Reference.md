## Docs for local

```bash
# Just for local, in production. I locked this path
http://localhost/docs#/
```

## Auth Forwarding
```bash
# Forward Login To Auth Service
POST
/api/v1/auth/login

# Get Refresh Token
PUT
/api/v1/auth/refresh

# Logout
DELETE
/api/v1/auth/logout
```

### Customers Forwarding
```bash 

# Forward Get Profile
GET
/api/v1/customers/me

```
