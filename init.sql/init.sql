-- 创建应用数据库
CREATE DATABASE app_db;

-- 创建专属用户
CREATE USER app_user WITH ENCRYPTED PASSWORD 'StrongPassword!';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;

-- 切换到应用数据库
\c app_db

-- 创建表结构
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入初始化数据
INSERT INTO users (email) VALUES ('admin@example.com');