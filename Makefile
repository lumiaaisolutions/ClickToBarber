.PHONY: help up down restart logs ps fresh seed back front dev install clean

help:
	@echo "BarberPro — comandos disponibles:"
	@echo "  make install   Instala dependencias backend + frontend"
	@echo "  make up        Levanta postgres + redis + mailpit (Docker)"
	@echo "  make down      Detiene contenedores"
	@echo "  make fresh     Migra desde cero + seeders"
	@echo "  make back      Levanta backend Laravel en :8000"
	@echo "  make front     Levanta frontend Next.js en :3000"
	@echo "  make dev       Levanta TODO (db + back + front)"
	@echo "  make logs      Logs de contenedores"
	@echo "  make clean     Borra node_modules, vendor, volúmenes"

install:
	cd backend && composer install --no-interaction
	cd frontend && npm install

up:
	docker compose up -d
	@echo "Esperando a que postgres y redis estén sanos..."
	@sleep 3
	docker compose ps

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

ps:
	docker compose ps

fresh:
	cd backend && php artisan migrate:fresh --seed --force

back:
	cd backend && php artisan serve --host=127.0.0.1 --port=8000

front:
	cd frontend && npm run dev

dev:
	@echo "Levanta primero 'make up' y luego en dos terminales: 'make back' y 'make front'"

clean:
	rm -rf backend/vendor frontend/node_modules
	docker compose down -v
