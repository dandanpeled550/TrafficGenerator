# Traffic Generator API Documentation

## Base URL
```
https://<your-backend-domain>/api
```

---

## Traffic Endpoints

### 1. Generate Traffic

**POST** `/api/traffic/generate`

- **Description:** Start generating traffic with the specified configuration.
- **Request Body:**
  ```json
  {
    "campaign_id": "string",
    "target_url": "string",
    "requests_per_minute": 10,
    "duration_minutes": 60,
    "geo_locations": ["United States"],
    "rtb_config": { /* optional RTB config */ },
    "config": { /* optional extra config */ },
    "user_profiles": [ /* optional user profiles */ ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Traffic generation started",
    "data": {
      "campaign_id": "string"
    }
  }
  ```

---

### 2. Get All Generated Traffic

**GET** `/api/traffic/generated`

- **Description:** Retrieve all generated traffic data across all campaigns.
- **Response:**
  ```json
  [
    { /* traffic data object */ },
    ...
  ]
  ```

---

### 3. Get Generated Traffic for a Specific Campaign

**GET** `/api/traffic/generated/{campaign_id}`

- **Description:** Retrieve all generated traffic data for a specific campaign.
- **Response:**
  ```json
  [
    { /* traffic data object for the campaign */ },
    ...
  ]
  ```

---

## Session Endpoints

### 4. Create a Session

**POST** `/api/sessions/`

- **Description:** Create a new traffic session.
- **Request Body:**  
  Same as above, but without `campaign_id`.
- **Response:**  
  Returns the created session object.

---

### 5. List All Sessions

**GET** `/api/sessions/`

- **Description:** Get a list of all traffic sessions.
- **Response:**  
  Returns a list of session objects.

---

### 6. Get a Specific Session

**GET** `/api/sessions/{session_id}`

- **Description:** Get details for a specific session.
- **Response:**  
  Returns the session object.

---

### 7. Update a Session

**PUT** `/api/sessions/{session_id}`

- **Description:** Update a session's details.
- **Request Body:**  
  Same as session creation, but all fields are optional.
- **Response:**  
  Returns the updated session object.

---

### 8. Delete a Session

**DELETE** `/api/sessions/{session_id}`

- **Description:** Delete a session.
- **Response:**  
  `{ "message": "Session deleted successfully" }`

---

## Health Check

**GET** `/health`

- **Description:** Check if the API is running.
- **Response:**  
  `{ "status": "healthy", "version": "1.0.0" }`

---

## Data Storage Notes

- **Per-campaign traffic:** Each campaign's generated traffic is saved in a separate file: `backend/app/api/traffic_data/{campaign_id}.json`
- **All traffic:** All generated traffic is also saved in a global file: `backend/app/api/traffic_data/all_traffic.json`
- **Retrieval:** Use the endpoints above to fetch traffic data on demand.
- If you want to store and retrieve logs or other data, you'll need to implement additional endpoints and storage. 