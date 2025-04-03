# Use Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8080

# Run with gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app.main:app"]

