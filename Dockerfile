# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install dependencies
# We are including requests, openai, and matplotlib which were found in the script
# but missing from the original requirements.txt
RUN pip install --no-cache-dir streamlit pandas fpdf python-dateutil requests openai matplotlib

# Copy the rest of the application's code
COPY . .

# Expose the port that Streamlit runs on
EXPOSE 8501

# Set the healthcheck
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Command to run the app
CMD ["streamlit", "run", "sistema_bfx.py", "--server.port=8501", "--server.address=0.0.0.0"]
