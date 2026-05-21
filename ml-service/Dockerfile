FROM python:3.11-slim

WORKDIR /app

# System dependencies (torch ke liye)
RUN apt-get update && apt-get install -y \
    gcc g++ git \
    && rm -rf /var/lib/apt/lists/*

# Dependencies pehle install karo (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App copy karo
COPY . .

# Dirs banao
RUN mkdir -p data/processed logs hf_cache

EXPOSE 8001

CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8001"]
