FROM python:3-slim

WORKDIR /app

RUN pip install --no-cache-dir "fastapi" "uvicorn[standard]" "pydantic[email]" pydantic-settings jinja2

COPY app/ /app/

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]