# Technical Assignment: Backend Design for Talf Solar MIS

## 1. Project Overview
Talf Solar MIS is a comprehensive Management Information System used to track the performance, financial revenue, and technical KPIs of a solar portfolio. Currently, the application is a frontend-only prototype using `localStorage` for data persistence and mocked services for third-party API integrations (SolisCloud).

**Objective:** Design and document a robust, scalable, and flexible backend architecture that replaces the current mock system and supports multi-vendor inverter API integrations.

---

## 2. Core Requirements

### 2.1 User Management & Security
- **Authentication:** Implement a secure authentication system (e.g., JWT-based).
- **Role-Based Access Control (RBAC):**
    - `Admin`: Full access to system settings, user management, and project configuration.
    - `Operations`: Can manage project data, breakdown events, and trigger API syncs.
    - `Viewer`: Read-only access to dashboards and reports.
- **Security:** Secure storage of third-party API credentials (API Keys/Secrets) using encryption at rest (e.g., AES-256).

### 2.2 Project & Asset Management
- **CRUD Operations:** Manage `Projects`, `Inverters`, and `Module Builds`.
- **Data Model:** Design a relational schema that supports:
    - One-to-Many: Project -> Inverters.
    - One-to-Many: Project -> Monthly Data.
    - One-to-Many: Inverter -> Breakdown Events.
    - Reference: Inverter -> Module Build.

### 2.3 Data Ingestion Layer (The "Flexible" Part)
The system must support data from multiple sources:
- **Manual Entry:** API endpoints for bulk uploading monthly CSVs or manual form submissions.
- **Automated Inverter Integration:**
    - Implement an **Adapter Pattern** or **Provider Pattern** to handle different inverter APIs:
        - **SolisCloud:** Digesting plant and device-level data.
        - **Sungrow (iSolarCloud):** Fetching daily/monthly yield.
        - **TrackSO:** Integration with third-party IoT loggers.
    - **Background Jobs:** Use a task queue (e.g., BullMQ, Celery) to schedule periodic data synchronization (e.g., every night at 2 AM).

### 2.4 Calculation Engine
Move the complex KPI logic (PR, CUF, Yield, Revenue, Degradation-adjusted targets) from the frontend to the backend.
- **Pre-aggregation:** Calculate and store monthly/daily KPIs in the database to ensure fast dashboard loading.
- **Consistency:** Ensure that "Theoretical Energy" and "Target P50" calculations are standardized across all vendors.

### 2.5 Real-time Proxy
- Create a secure proxy endpoint for fetching live inverter data (Power, Voltage, Temp).
- The backend should handle the signature generation and authentication for the third-party APIs so the frontend never sees the API Secrets.

---

## 3. Technical Constraints & Recommendations
- **Language:** Node.js (TypeScript) or Python (FastAPI/Django).
- **Database:** PostgreSQL (highly recommended for relational integrity).
- **Caching:** Redis for session management and API response caching.
- **Documentation:** All endpoints must be documented using Swagger/OpenAPI.

---

## 4. Deliverables Expected
1. **System Architecture Diagram:** Showing the flow between the Frontend, Backend, Database, Task Queue, and External APIs.
2. **Database Schema Design:** An ERD (Entity Relationship Diagram).
3. **API Specification:** A list of core endpoints with request/response structures.
4. **Integration Strategy:** A brief explanation of how a new inverter vendor (e.g., Huawei) would be added to the system without rewriting core logic.

---

## 5. Evaluation Criteria
- **Robustness:** How does the system handle API failures or rate limits from vendors?
- **Flexibility:** How easy is it to add a new "Provider"?
- **Security:** Are API keys and user data protected?
- **Performance:** Will the dashboard still load fast with 500+ projects?
