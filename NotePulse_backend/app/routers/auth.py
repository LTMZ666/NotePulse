"""用户认证路由：注册、登录"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import User
from app.schemas import UserRegister, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=Token, summary="注册")
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="该用户名已被使用")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": UserOut.model_validate(user)}


@router.post("/login", response_model=Token, summary="登录")
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == body.account) | (User.email == body.account)
    ).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut, summary="获取当前用户信息")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
