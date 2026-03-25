# Testing & Verification Guide

Complete guide to verify all 5 production-level fixes are working correctly.

---

## ✅ ISSUE 1: File Validation Testing

### Test: Reject missing metadata
```bash
# Create a file without proper metadata
# Should REJECT
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  -F "file=@noextension_file" \
  http://localhost:8001/analyze

# Expected Response: 400
# {
#   "detail": "Unsupported file format. Only JPG, PNG, TIFF allowed."
# }
```

### Test: Accept valid formats
```bash
# Should ACCEPT (JPG)
curl -X POST -F "file=@image.jpg" http://localhost:8001/analyze

# Should ACCEPT (PNG)
curl -X POST -F "file=@image.png" http://localhost:8001/analyze

# Should ACCEPT (TIFF)
curl -X POST -F "file=@image.tif" http://localhost:8001/analyze

# Expected Response: 200 with analysis results
```

### Test: Reject invalid formats
```bash
# Should REJECT (BMP - even if PIL can load)
curl -X POST -F "file=@image.bmp" http://localhost:8001/analyze

# Should REJECT (GIF)
curl -X POST -F "file=@image.gif" http://localhost:8001/analyze

# Should REJECT (WebP)
curl -X POST -F "file=@image.webp" http://localhost:8001/analyze

# Should REJECT (TIFF with wrong extension)
convert image.tif renamed.jpg  # Rename TIFF as JPG
curl -X POST -F "file=@renamed.jpg" http://localhost:8001/analyze
# PIL will detect it's actually TIFF, which IS allowed, should ACCEPT

# But if you disguise non-JPEG/PNG/TIFF as one:
# Convert BMP to JPG extension
curl -X POST -F "file=@image_bmp.jpg" http://localhost:8001/analyze
# Should REJECT: format not in ALLOWED_IMAGE_FORMATS
```

### Verification in Logs
```
[your_backend_log]
2024-XX-XX XX:XX:XX WARNING [satellite-backend] Validation failed: both content_type and filename are missing
2024-XX-XX XX:XX:XX WARNING [satellite-backend] Validation failed: actual image format not allowed (format=BMP)
```

---

## ✅ ISSUE 2: JSON Validation Testing

### Test: Normal operation (should work)
```bash
# Should work fine
curl -X POST -F "file=@valid_image.jpg" http://localhost:8001/analyze

# Expected: 200 with full analysis
```

### Test: Monitor for JSON validation (if Gemini misbehaves)
```bash
# These tests require forcing Gemini to return bad JSON
# In production, look for logs indicating JSON validation errors:

# Logs to watch for:
# 2024-XX-XX XX:XX:XX ERROR [satellite-backend] Invalid JSON response from Gemini: expected dict, got list

# API Response should be:
# {
#   "detail": "Invalid response format from Gemini: expected JSON object"
# }
# with status 502
```

### Verification in Logs
```
[your_backend_log]
# If Gemini returns array instead of dict:
2024-XX-XX XX:XX:XX ERROR [satellite-backend] Invalid JSON response from Gemini: expected dict, got list

# If improvements key is missing:
2024-XX-XX XX:XX:XX ERROR [satellite-backend] Gemini response missing or invalid 'improvements' key (type=missing)
```

---

## ✅ ISSUE 3: Health Endpoint Testing

### Test: Health endpoint response
```bash
curl http://localhost:8001/health

# Expected Response: 200
# {
#   "status": "ok",
#   "gemini_configured": true
# }

# Note: NO "model_loaded" field (removed from documentation)
```

### Verify Response Schema
```bash
# Check OpenAPI schema
curl http://localhost:8001/openapi.json | jq '.components.schemas.HealthResponse'

# Should show:
# {
#   "properties": {
#     "status": {"type": "string"},
#     "gemini_configured": {"type": "boolean"}
#   },
#   "required": ["status", "gemini_configured"]
# }
# No "model_loaded" in schema
```

---

## ✅ ISSUE 4: CORS Security Testing

### Test 1: Wildcard origin (credentials disabled)
```bash
# Verify credentials=False when allow_origins="*"
export CORS_ALLOW_ORIGINS="*"
# Check startup logs:
# INFO:     CORS configured with allow_origins='*', credentials disabled

# Test request:
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:8001/analyze

# Should respond with:
# Access-Control-Allow-Origin: *
# (NO Access-Control-Allow-Credentials header)
```

### Test 2: Explicit origins (credentials enabled)
```bash
# Configure explicit origins
export CORS_ALLOW_ORIGINS="https://example.com, https://app.example.com"
# Check startup logs:
# INFO:     CORS configured with explicit origins: ['https://example.com', 'https://app.example.com']

# Test from trusted origin:
curl -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:8001/health

# Should respond with:
# Access-Control-Allow-Origin: https://example.com
# Access-Control-Allow-Credentials: true

# Test from untrusted origin:
curl -H "Origin: https://evil.com" \
  http://localhost:8001/health

# Should NOT include Origin-specific headers
```

### Verification in Logs
```
# Startup logs should show configuration:
INFO:     CORS configured with allow_origins='*', credentials disabled
# OR
INFO:     CORS configured with explicit origins: ['https://example.com', 'https://api.example.com']
```

---

## ✅ ISSUE 5: HTTP Client Efficiency Testing

### Test 1: Startup and shutdown lifecycle
```bash
# Start server
uvicorn main:app --host 127.0.0.1 --port 8001

# Check logs for:
INFO:     Starting up: initializing Gemini HTTP client
INFO:     Started server process [XXXX]

# Stop server (Ctrl+C)
# Check logs for:
INFO:     Shutting down: closing Gemini HTTP client
INFO:     Shutdown complete
```

### Test 2: Connection reuse (monitor with strace/netstat)
```bash
# Monitor connections during requests
# In another terminal:
watch -n 0.1 'netstat -an | grep :443'  # For HTTPS to Gemini API

# Then make multiple requests:
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST -F "file=@image.jpg" http://localhost:8001/analyze > /dev/null 2>&1
  sleep 1
done

# Observe: Connections should reuse keep-alive instead of creating new ones
```

### Test 3: Performance baseline (optional)
```bash
# Measure response time (should be ~3-6 seconds for full pipeline)
time curl -X POST -F "file=@image.jpg" http://localhost:8001/analyze > /dev/null 2>&1

# Before fix: May show overhead in connection setup
# After fix: Cleaner timing, ~15-30ms faster due to shared client
```

### Verification in Logs
```
# Startup:
INFO:     Starting up: initializing Gemini HTTP client

# Regular requests (all reuse same client):
INFO [satellite-backend] Image received: filename=image.jpg size_bytes=XXXXX
INFO [satellite-backend] Gemini step 1: analyze_image
INFO [satellite-backend] Gemini step 2: get_improvements
INFO [satellite-backend] Gemini step 3: generate_image
INFO [satellite-backend] Analyze completed successfully

# Shutdown:
INFO:     Shutting down: closing Gemini HTTP client
```

---

## 🔍 Complete Integration Test

### Full Pipeline Test
```bash
# 1. Start server
uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# 2. Check health
curl http://localhost:8001/health
# Expected: 200 with status=ok, gemini_configured=true

# 3. Upload valid image
curl -X POST -F "file=@test_satellite_image.jpg" http://localhost:8001/analyze
# Expected: 200 with full analysis

# 4. Try invalid format
curl -X POST -F "file=@test.bmp" http://localhost:8001/analyze
# Expected: 400 with "Unsupported file format"

# 5. Try missing metadata
curl -H "Content-Type: application/octet-stream" \
  -F "file=@unknown_file" http://localhost:8001/analyze
# Expected: 400 with "Unsupported file format"
```

---

## 📊 Monitoring & Logs

### Key Log Patterns to Watch

#### ✅ Healthy Operation
```
INFO [satellite-backend] Image received: filename=satellite.jpg size_bytes=2547391
INFO [satellite-backend] Gemini step 1: analyze_image
INFO [satellite-backend] Gemini step 2: get_improvements
INFO [satellite-backend] Gemini step 3: generate_image
INFO [satellite-backend] Analyze completed successfully
```

#### ⚠️ Validation Rejection
```
WARNING [satellite-backend] Validation failed: unsupported mime type (content_type=image/bmp)
WARNING [satellite-backend] Validation failed: both content_type and filename are missing
WARNING [satellite-backend] Validation failed: actual image format not allowed (format=BMP)
```

#### ⚠️ JSON Parsing Issue
```
ERROR [satellite-backend] Invalid JSON response from Gemini: expected dict, got list
ERROR [satellite-backend] Gemini response missing or invalid 'improvements' key (type=missing)
```

#### ⚠️ API Errors
```
ERROR [satellite-backend] Gemini request failed (status=429 model=gemini-1.5-flash)
ERROR [satellite-backend] Gemini pipeline failed
```

---

## 🧪 Manual Testing Commands

### Create Test Images
```bash
# JPG (should pass)
convert -size 256x256 xc:blue test_valid.jpg

# PNG (should pass)
convert -size 256x256 xc:green test_valid.png

# TIFF (should pass)
convert -size 256x256 xc:red test_valid.tif

# BMP (should fail after fix)
convert -size 256x256 xc:yellow test_invalid.bmp

# GIF (should fail after fix)
convert -size 256x256 xc:purple test_invalid.gif
```

### Test Batch Script
```bash
#!/bin/bash

echo "Testing valid formats..."
for format in jpg png tif; do
  echo "- Testing $format..."
  curl -s -X POST -F "file=@test_valid.$format" \
    http://localhost:8001/analyze > /dev/null && echo "  ✓ Passed" || echo "  ✗ Failed"
done

echo ""
echo "Testing invalid formats..."
for format in bmp gif; do
  echo "- Testing $format..."
  curl -s -X POST -F "file=@test_invalid.$format" \
    http://localhost:8001/analyze | grep -q "Unsupported file format" && echo "  ✓ Passed (correctly rejected)" || echo "  ✗ Failed"
done

echo ""
echo "Testing health endpoint..."
curl -s http://localhost:8001/health | jq . && echo "✓ Passed"
```

---

## ✅ Verification Checklist

- [ ] File validation rejects missing metadata
- [ ] File validation accepts JPG, PNG, TIFF
- [ ] File validation rejects BMP, GIF, WebP
- [ ] File validation checks actual image.format from PIL
- [ ] JSON validation handles non-dict responses (returns 502, not 500)
- [ ] Health endpoint returns correct response (no model_loaded)
- [ ] Health endpoint OpenAPI schema is correct
- [ ] CORS with wildcard disables credentials
- [ ] CORS with explicit origins enables credentials
- [ ] Startup logs show "initializing Gemini HTTP client"
- [ ] Shutdown logs show "closing Gemini HTTP client"
- [ ] Multiple requests reuse same HTTP client
- [ ] Full pipeline works end-to-end
- [ ] Error codes are correct (400, 413, 502, 500)
- [ ] Logging is clear and diagnostic

---

## 🐛 Troubleshooting

### Issue: File validation still accepting BMP
**Check:**
- Restart server (schema change might need reload)
- Verify PIL/Pillow is up to date: `pip install --upgrade Pillow`
- Check logs for "actual image format not allowed"

### Issue: CORS credentials still enabled with wildcard
**Check:**
- Verify `CORS_ALLOW_ORIGINS=*` is set in .env
- Check startup logs for "credentials disabled"
- Restart server if .env changed
- Verify YYYY-MM-DDXXX `_parse_cors_origins()` is being called

### Issue: Gemini client not initializing
**Check:**
- Ensure lifespan is enabled in FastAPI app
- Check for errors in startup: `logger.info("Starting up: initializing Gemini HTTP client")`
- Verify GEMINI_API_KEY is set
- Check for port conflicts or startup errors

### Issue: JSON validation not working
**Check:**
- Verify logger is imported and configured
- Check logs for "Invalid JSON response from Gemini"
- Ensure `isinstance(parsed, dict)` check is present
- Test with artificially bad response (unit test)

---

## 📝 Notes

All fixes are backward compatible. API consumer code doesn't need changes except:
- Update any code expecting `model_loaded` in health response
- Adjust CORS if coming from different origin in production

No database migrations needed. No breaking changes to request/response contracts (except documented removal of model_loaded from health).
