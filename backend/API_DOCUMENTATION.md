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

## Session Endpoints

### 2. Create a Session

**POST** `/api/sessions/`

- **Description:** Create a new traffic session.
- **Request Body:**  
  Same as above, but without `campaign_id`.
- **Response:**  
  Returns the created session object.

---

### 3. List All Sessions

**GET** `/api/sessions/`

- **Description:** Get a list of all traffic sessions.
- **Response:**  
  Returns a list of session objects.

---

### 4. Get a Specific Session

**GET** `/api/sessions/{session_id}`

- **Description:** Get details for a specific session.
- **Response:**  
  Returns the session object.

---

### 5. Update a Session

**PUT** `/api/sessions/{session_id}`

- **Description:** Update a session's details.
- **Request Body:**  
  Same as session creation, but all fields are optional.
- **Response:**  
  Returns the updated session object.

---

### 6. Delete a Session

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

## Notes

- There are currently **no endpoints to directly fetch logs or generated traffic data**. Traffic is generated in the background, and logs are only printed to the server console.
- If you want to store and retrieve logs or generated traffic, you'll need to implement additional endpoints and storage. 