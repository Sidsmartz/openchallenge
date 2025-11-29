# Whisper Service Setup Guide

This guide explains how to set up and deploy the separated Whisper transcription service.

## Architecture

The Whisper model has been separated into a standalone Flask service that can be deployed independently from the main Next.js application. This provides several benefits:

1. **Independent Scaling**: Scale the Whisper service separately based on transcription demand
2. **Resource Isolation**: Heavy ML processing doesn't affect the main application
3. **Flexible Deployment**: Deploy on GPU-enabled servers for faster transcription
4. **Easy Updates**: Update the Whisper model without redeploying the main app

## Quick Start

### Option 1: Local Development

1. Navigate to the whisper-service directory:
```bash
cd whisper-service
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the service:
```bash
python app.py
```

4. Update your `.env.local` in the main project:
```env
WHISPER_SERVICE_URL=http://localhost:5000
```

### Option 2: Docker (Recommended for Production)

1. Build the Docker image:
```bash
cd whisper-service
docker build -t whisper-service .
```

2. Run the container:
```bash
docker run -d -p 5000:5000 \
  -e WHISPER_MODEL=base \
  --name whisper-service \
  whisper-service
```

3. Update your `.env.local`:
```env
WHISPER_SERVICE_URL=http://localhost:5000
```

## Deployment Options

### 1. Render.com (Easiest)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the root directory to `whisper-service`
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Environment Variables**:
     - `WHISPER_MODEL=base`
     - `PORT=10000` (Render default)

5. Deploy and copy the service URL
6. Update your main app's environment variable:
```env
WHISPER_SERVICE_URL=https://your-whisper-service.onrender.com
```

### 2. Railway.app

1. Create a new project on Railway
2. Deploy from GitHub
3. Railway will auto-detect the Dockerfile
4. Add environment variable:
   - `WHISPER_MODEL=base`
5. Copy the generated URL
6. Update your main app:
```env
WHISPER_SERVICE_URL=https://your-service.railway.app
```

### 3. Heroku

1. Create a new Heroku app:
```bash
heroku create your-whisper-service
```

2. Set buildpack:
```bash
heroku buildpacks:set heroku/python
```

3. Deploy:
```bash
cd whisper-service
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-whisper-service
git push heroku main
```

4. Set config:
```bash
heroku config:set WHISPER_MODEL=base
```

5. Update your main app:
```env
WHISPER_SERVICE_URL=https://your-whisper-service.herokuapp.com
```

### 4. AWS/GCP/Azure (Advanced)

For production deployments with high traffic:

1. Deploy using Docker on:
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances

2. Consider using GPU instances for faster transcription:
   - AWS EC2 with GPU (g4dn instances)
   - GCP Compute Engine with GPU
   - Azure NC-series VMs

3. Set up auto-scaling based on CPU/memory usage

## Model Selection

Choose the appropriate Whisper model based on your needs:

| Model  | Size | Speed | Accuracy | RAM Required |
|--------|------|-------|----------|--------------|
| tiny   | 39M  | ~32x  | Good     | ~1GB         |
| base   | 74M  | ~16x  | Better   | ~1GB         |
| small  | 244M | ~6x   | Great    | ~2GB         |
| medium | 769M | ~2x   | Excellent| ~5GB         |
| large  | 1550M| ~1x   | Best     | ~10GB        |

**Recommendation**: Start with `base` for development and `small` for production.

Set the model via environment variable:
```env
WHISPER_MODEL=base
```

## Testing the Service

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "base"
}
```

### Test Transcription
```bash
curl -X POST http://localhost:5000/transcribe-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-video-url.mp4",
    "language": "en"
  }'
```

## Monitoring

### Logs

**Docker**:
```bash
docker logs whisper-service
```

**Render/Railway/Heroku**:
Check the platform's log viewer in the dashboard

### Performance Metrics

Monitor these metrics:
- Response time (should be < 30s for short videos)
- Memory usage (should stay within model requirements)
- CPU usage (high during transcription is normal)
- Error rate (should be < 1%)

## Troubleshooting

### Service not responding
1. Check if the service is running:
```bash
curl http://localhost:5000/health
```

2. Check logs for errors

3. Verify FFmpeg is installed in the container

### Out of memory errors
- Use a smaller model (tiny or base)
- Increase deployment resources
- Add memory limits to prevent crashes

### Slow transcription
- Use a smaller model
- Deploy on GPU-enabled infrastructure
- Consider caching results

### Connection errors from Next.js
1. Verify `WHISPER_SERVICE_URL` is set correctly
2. Check network connectivity
3. Ensure CORS is enabled (already configured in Flask app)
4. Check firewall rules if deployed on cloud

## Security Considerations

1. **API Authentication**: Add API key authentication for production:
```python
# In app.py
API_KEY = os.getenv('API_KEY')

@app.before_request
def check_api_key():
    if request.endpoint != 'health_check':
        key = request.headers.get('X-API-Key')
        if key != API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401
```

2. **Rate Limiting**: Add rate limiting to prevent abuse:
```bash
pip install flask-limiter
```

3. **HTTPS**: Always use HTTPS in production (handled by deployment platforms)

4. **File Size Limits**: Configure maximum file size in Flask

## Cost Optimization

1. **Use smaller models**: `tiny` or `base` for most use cases
2. **Cache results**: Store transcriptions to avoid re-processing
3. **Auto-scaling**: Scale down during low traffic
4. **Spot instances**: Use spot/preemptible instances for cost savings

## Migration from Local Whisper

The main application has been updated to use the Whisper service. To complete the migration:

1. Deploy the Whisper service
2. Set `WHISPER_SERVICE_URL` environment variable
3. Test transcription functionality
4. Remove local Python dependencies (optional):
   - `openai-whisper`
   - `scripts/transcribe.py`

## Support

For issues or questions:
1. Check the logs first
2. Verify environment variables
3. Test the health endpoint
4. Review the Flask app logs

The service maintains the same functionality as the local implementation while providing better scalability and deployment flexibility.
