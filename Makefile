.PHONY: build run clean dev test setup-db seed-db

# Go 相关
BINARY_NAME=server
BUILD_DIR=bin

# 数据库相关
DB_NAME=programming_oj

build:
	cd backend && go build -o $(BUILD_DIR)/$(BINARY_NAME) cmd/server/main.go

run: build
	cd backend && $(BUILD_DIR)/$(BINARY_NAME)

dev:
	cd backend && go run cmd/server/main.go

clean:
	cd backend && rm -rf $(BUILD_DIR)

test:
	cd backend && go test ./...

# 数据库操作
setup-db:
	createdb $(DB_NAME) || true
	psql -d $(DB_NAME) -f backend/database/schema.sql

seed-db:
	psql -d $(DB_NAME) -f backend/database/seed.sql

reset-db:
	dropdb $(DB_NAME) || true
	createdb $(DB_NAME)
	psql -d $(DB_NAME) -f backend/database/schema.sql
	psql -d $(DB_NAME) -f backend/database/seed.sql

# 前端
frontend-dev:
	npm run dev

# 启动整个项目
start-all:
	@echo "Starting backend..."
	@cd backend && go run cmd/server/main.go &
	@sleep 2
	@echo "Starting frontend..."
	@npm run dev

install:
	cd backend && go mod download
	npm install

# 帮助
help:
	@echo "Available commands:"
	@echo "  make build      - Build the backend binary"
	@echo "  make run        - Build and run the backend"
	@echo "  make dev        - Run backend in development mode"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make test       - Run tests"
	@echo "  make setup-db   - Create database and run migrations"
	@echo "  make seed-db    - Seed the database with initial data"
	@echo "  make reset-db   - Reset database (drop, create, migrate, seed)"
	@echo "  make frontend-dev - Run frontend in development mode"
	@echo "  make install    - Install all dependencies"
