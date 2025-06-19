# Traffic Generator Backend API Documentation

## Base URL
```
/api/traffic/
```

---

## Endpoints

### 1. POST `/generate`
**Start traffic generation for a campaign.**

- **Request Body:**  
  ```json
  {
    "campaign_id": "string"
  }
  ```
  (Other config fields are loaded from the campaign/session.)

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "message": "Traffic generation started successfully",
      "campaign_id": "string",
      "status": "running",
      "thread_id": "string",
      "config": { ... }
    }
    ```
  - `400/404/409/500`  
    Error details if campaign is missing, not in 'running' status, or already running.

---

### 2. POST `/stop/<campaign_id>`
**Stop traffic generation for a campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    { "success": true, "message": "Traffic generation stopped successfully" }
    ```
  - `404/500`  
    Error details if campaign is not running or on failure.

---

### 3. POST `/cleanup/<campaign_id>`
**Clean up all resources associated with a campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    { "success": true, "message": "Campaign resources cleaned up successfully" }
    ```
  - `500`  
    Error details.

---

### 4. GET `/monitor/<campaign_id>`
**Get real-time monitoring data for a campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": {
        "campaign_id": "string",
        "is_running": true/false,
        "has_data": true/false,
        "last_updated": "timestamp",
        "total_requests": int,
        "successful_requests": int,
        "last_request": { ... },
        "requests_per_minute": float,
        "success_rate": float,
        "average_response_time": float
      }
    }
    ```
  - `500`  
    Error details.

---

### 5. GET `/generated/<campaign_id>`
**Get all generated traffic data for a specific campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": [ ...traffic entries... ],
      "metadata": {
        "total_requests": int,
        "successful_requests": int,
        "last_updated": "timestamp"
      }
    }
    ```
  - `404/500`  
    Error details.

---

### 6. GET `/download/<campaign_id>`
**Download all generated traffic data for a campaign (with metadata).**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": {
        "campaign_id": "string",
        "download_time": "timestamp",
        "total_requests": int,
        "successful_requests": int,
        "traffic_data": [ ... ]
      },
      "filename": "traffic_<campaign_id>_<timestamp>.json"
    }
    ```
  - `404/500`  
    Error details.

---

### 7. GET `/generated`
**Get all generated traffic data across all campaigns.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": [ ...traffic entries... ]
    }
    ```
  - `500`  
    Error details.

---

### 8. GET `/stats/<campaign_id>`
**Get statistics for a specific campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": {
        "total_requests": int,
        "successful_requests": int,
        "success_rate": float,
        "unique_geo_locations": int,
        "unique_device_models": int,
        "unique_ad_formats": int,
        "start_time": "timestamp",
        "end_time": "timestamp",
        "duration_minutes": float,
        "requests_per_minute": float
      }
    }
    ```
  - `404/500`  
    Error details.

---

### 9. GET `/status/<campaign_id>`
**Get the current status of a campaign.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": {
        "campaign_id": "string",
        "is_running": true/false,
        "has_data": true/false,
        "last_updated": "timestamp",
        "total_requests": int,
        "successful_requests": int,
        "last_request": { ... }
      }
    }
    ```
  - `500`  
    Error details.

---

### 10. GET `/health`
**Check the health of the traffic generation service.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "status": "healthy",
      "message": "Traffic generation service is healthy",
      "data": {
        "traffic_data_dir": "path",
        "timestamp": "timestamp",
        "active_campaigns": [ ... ],
        "campaign_stats": { ... },
        "total_active_campaigns": int,
        "system_info": { ... }
      }
    }
    ```
  - `500`  
    Error details.

---

### 11. POST `/test`
**Test traffic generation and simulation functions.**

- **Request Body:**  
  ```json
  {
    "test_type": "generate_traffic_data" | "simulate_request" | "full_traffic_simulation",
    ...other test params...
  }
  ```

- **Responses:**  
  - `200 OK`  
    Returns detailed test results, analytics, and verification for the requested test type.
  - `400/500`  
    Error details.

---

### 12. PUT `/campaigns/<campaign_id>/status`
**Update campaign status and manage transitions.**

- **Request Body:**  
  ```json
  { "status": "draft" | "running" | "paused" | "completed" | "stopped" | "error" }
  ```

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "message": "Campaign status updated to <status>",
      "campaign_id": "string",
      "previous_status": "string",
      "new_status": "string",
      "updated_at": "timestamp"
    }
    ```
  - `400/404/409/500`  
    Error details.

---

### 13. GET `/campaigns/<campaign_id>/info`
**Get comprehensive campaign information, including status and traffic generation state.**

- **Responses:**
  - `200 OK`  
    ```json
    {
      "success": true,
      "data": {
        "campaign_id": "string",
        "basic_info": { ... },
        "traffic_generation": { ... },
        "traffic_stats": { ... },
        "configuration": { ... }
      }
    }
    ```
  - `404/500`  
    Error details.

---

## Supporting Functions

- **Traffic Generation:**  
  - Generates traffic in a background thread per campaign.
  - Simulates HTTP requests, network latency, and RTB (real-time bidding) data.
  - Writes results to campaign-specific files.

- **Campaign Status Management:**  
  - All status transitions are validated and enforced via the `/campaigns/<id>/status` endpoint.
  - Only campaigns in `"running"` status can start traffic generation.

- **Monitoring & Analytics:**  
  - Real-time stats, progress, and health checks are available for each campaign.

---

## Error Handling

- All endpoints return a `success: false` and an `error` message on failure.
- Status codes are used appropriately (`400`, `404`, `409`, `500`).

---

## Typical Workflow

1. **Create a campaign** (via sessions API, not shown here).
2. **Set campaign status to `"running"`** using `/campaigns/<id>/status`.
3. **Start traffic generation** using `/generate`.
4. **Monitor progress** using `/monitor/<id>` or `/status/<id>`.
5. **Stop traffic** using `/stop/<id>` and set status to `"stopped"`.
6. **Download or analyze results** using `/download/<id>`, `/generated/<id>`, or `/stats/<id>`.

---

## Notes

- All endpoints expect and return JSON.
- All file operations are campaign-specific and thread-safe.
- Logging is enabled for all major operations. 