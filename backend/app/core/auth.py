import os
import hashlib
# pyrefly: ignore [missing-import]
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import Depends, HTTPException, status, Header
# pyrefly: ignore [missing-import]
from fastapi.security import OAuth2PasswordBearer
from app.core.auth_db import AuthDatabaseManager

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "7b66df8708ba1c3fcd9891823ab49cd2bf3cf286780c102a0614838b")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# Database Instance singleton
auth_db = AuthDatabaseManager()

# Token extraction scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    """Hashes password securely using PBKDF2 with SHA-256 and a random salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ":" + key.hex()

def verify_password(password: str, hashed: str) -> bool:
    """Verifies standard input password matches hash signature."""
    try:
        salt_hex, key_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return key == expected_key
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT access token for active session tracking."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes JWT claims and verifies signatures."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    FastAPI dependency ensuring request contains a valid Bearer JWT.
    Returns user details (id, username, role, tenant_type, enterprise_id).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        # Fallback to check if Authorization header is passed manually
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
        
    user = await auth_db.get_user_by_username(username)
    if user is None:
        raise credentials_exception
        
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "tenant_type": user["tenant_type"],
        "enterprise_id": user["enterprise_id"],
        "enterprise_name": user.get("enterprise_name"),
        "can_view_alerts": user.get("can_view_alerts", 1) == 1,
        "can_view_schema": user.get("can_view_schema", 1) == 1
    }

async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Authorization dependency ensuring user has the administrative role."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required."
        )
    return current_user

async def get_active_db(
    x_database_id: Optional[str] = Header(None, alias="x-database-id"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    FastAPI dependency resolving the target database connection details.
    Reads 'x-database-id' from headers, checks permission access, and returns details.
    """
    import os
    db_id = x_database_id or "default"
    
    if db_id == "default":
        return {
            "id": "default",
            "alias": "Default (Chinook)",
            "url": os.getenv("DATABASE_URL")
        }
        
    try:
        db_id_num = int(db_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid database ID format."
        )
        
    db_record = await auth_db.get_database(db_id_num)
    if not db_record:
        raise HTTPException(
            status_code=404,
            detail="Connected database not found."
        )
        
    # Check tenant isolation
    if current_user["tenant_type"] == "enterprise":
        if db_record["enterprise_id"] != current_user["enterprise_id"]:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Database access denied."
            )
    else: # single mode
        if db_record["enterprise_id"] is not None:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Database access denied."
            )
            
    # Check granular user-database permissions
    if current_user["role"] != "admin":
        has_access = await auth_db.check_user_database_access(current_user["id"], db_id)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Database access denied by administrator."
            )

    return {
        "id": str(db_record["id"]),
        "alias": db_record["alias"],
        "url": db_record["connection_url"]
    }
