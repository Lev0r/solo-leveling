# Memorandum of Understanding: Home Workout Tracker

## 1. Architecture & Tech Stack
* **Frontend Framework:** React
* **Build Tool:** Vite
* **Hosting:** Firebase Hosting (Free Tier)
* **Database:** Firebase Firestore (Free Tier). Selected for document-based scalability and native integration with Firebase Auth security rules.
* **Authentication:** Firebase Authentication (Google Auth provider).

## 2. Authentication & Authorization
* **Identity Provider:** Google Sign-In.
* **Access Control:** Whitelist approach. Read/write access is restricted to a single tenant. Firestore Security Rules must evaluate the `request.auth.token.email` or `request.auth.uid` against a hardcoded authorized owner value.
    * *Reference:* `allow read, write: if request.auth != null && request.auth.token.email == "owner@example.com";`

## 3. Core Logic & Routing
* **Main Screen ("Today's Workout"):** Renders the assigned list of exercises based on the current local date.
* **Cycle Calculation:** Continuous modulo arithmetic against a fixed anchor date to guarantee sequence continuity across calendar years.
    * *Implementation:* `const cycleIndex = Math.floor((CurrentDate - AnchorDate) / 86400000) % Routine.length;`

## 4. Data Architecture & State Management
* **Program Definition (`Routine` Schema):**
    * An ordered array of day configurations (e.g., `[Split A, Split B, Rest]`).
    * Stored as a singleton document in Firestore.
* **Workout Execution (`DailyLog` Schema):**
    * A separate Firestore collection indexing completed workouts by an ISO 8601 date string (e.g., `YYYY-MM-DD`).
    * **v1.0 Payload:** Stores boolean completion flags (`{ exerciseId: "bench_press", isCompleted: true }`).
    * **v2.0 Extensibility:** The schema decouples the log from the program definition, allowing future payloads to append quantitative metrics (`{ exerciseId: "bench_press", sets: [{ weight: 100, reps: 8 }] }`) without requiring data migration.

## 5. Configuration UI
* **Program Modification:** Implemented via a JSON Import/Export utility. The UI will feature functions to serialize the current Firestore `Routine` document to a downloadable JSON file, and parse an uploaded JSON file to overwrite the database. This satisfies the requirement for modification without developing a comprehensive CRUD interface.