# Use a minimal Python base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set working directory
WORKDIR /app

# Copy files
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy the entire app directory and all other files
COPY . .

# Set the startup command — note: main.py is inside the 'app' folder
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app.main:app"]
