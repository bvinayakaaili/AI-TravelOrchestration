import os
from datetime import datetime, timedelta
from typing import List

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt

from services.user_service.models import UserCreate, UserLogin, Token, UserResponse, PlanSaveRequest, TripHistoryRequest
from services.user_service.database import DatabaseManager, UserAlreadyExistsError

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ai-travel-planner-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_TTL_HOURS", 24))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(title="User & Auth Service", port=8006)
db = DatabaseManager()

# --- Auth Utilities ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.get_user(user_id)
    if user is None:
        raise credentials_exception
    return user

# --- Endpoints: Auth ---
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate):
    try:
        hashed_pw = get_password_hash(user.password)
        new_user = db.create_user(
            email=user.email,
            password_hash=hashed_pw,
            home_city=user.home_city,
            preferred_budget=user.preferred_budget,
            travel_style=user.travel_style
        )
        return new_user
    except UserAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already registered")

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# --- Endpoints: Plans & History ---
@app.post("/plans/save")
def save_plan(plan: PlanSaveRequest, current_user: dict = Depends(get_current_user)):
    return db.save_plan(
        user_id=current_user["id"],
        destination=plan.destination,
        query=plan.query,
        plan_json=plan.plan_json,
        is_favorite=plan.is_favorite
    )

@app.get("/plans/saved")
def get_saved_plans(current_user: dict = Depends(get_current_user)):
    return db.get_saved_plans(current_user["id"])

@app.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    success = db.delete_plan(current_user["id"], plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Plan not found or unauthorized")
    return {"status": "deleted"}

@app.post("/plans/history")
def add_history(history: TripHistoryRequest, current_user: dict = Depends(get_current_user)):
    return db.add_history(
        user_id=current_user["id"],
        query=history.query,
        response_json=history.response_json,
        services_called=history.services_called
    )

@app.get("/plans/history")
def get_trip_history(current_user: dict = Depends(get_current_user)):
    return db.get_history(current_user["id"])

@app.get("/health")
def health():
    return {"status": "healthy", "service": "user_service"}