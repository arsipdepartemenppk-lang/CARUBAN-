# Implementation Plan - Caruban Core Mobile Feature Updates

This plan outlines the implementation of high-priority UI and functional updates for the PC IPNU Cirebon digital platform, focusing on user experience, security, and offline reliability.

[!IMPORTANT]
The user `syifaudina15@gmail.com` (Ahmad Syifaudin) will be granted full `super-admin` access. Biometric authentication will be finalized in the login flow.

## 1. Overview & Core Concept
Caruban Core Mobile is the command center for PC IPNU Kabupaten Cirebon. This update enhances the "Beranda" (Home) experience with quick actions and real-time insights, while strengthening security through biometrics and improving reliability via expanded PWA offline synchronization.

## 2. User Experience & Visual Design

### Key User Flows
1.  **Quick Action Entry**: User opens the app, sees a horizontal scroll bar of common tasks (Log Attendance, Create Surat, Visitasi), and taps one to jump directly to the form.
2.  **Organization Insights**: User scrolls down Beranda to see real-time statistics (total members, active visitations) and a global activity feed of what's happening across the organization.
3.  **Biometric Login**: On the login page, the user can choose "Login Biometrik" after their first successful email/password login, allowing instant access via Fingerprint or FaceID.
4.  **Offline Productivity**: A user in a low-signal area registers a new member. The app indicates "Pending Sync". Once back online, the app automatically pushes the data to Firestore.

### Visual Identity & Theme
-   **Aesthetic**: Emerald/Green futuristic (Cyber-Islamic) aesthetic.
-   **Quick Actions**: Large, touch-friendly horizontal cards with vibrant gradients and iconography.
-   **Activity Feed**: Clean, vertical list with micro-interactions for new updates.
-   **Theme Toggle**: A floating action button (FAB) for quick switching between Light and Dark modes.

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Global vs Local Activity Feed
-   **Chosen Approach**: Global organization-wide stream.
-   **Why**: Encourages transparency and connection across different departments and komisariats.
-   **Alternative**: Showing only personal actions was considered but rejected to prioritize organizational cohesion.

### Decision 2: Offline Sync Scope
-   **Chosen Approach**: All primary forms (Attendance, Visitasi, Member) will support IndexedDB caching.
-   **Why**: Users often operate in remote areas of Cirebon with intermittent connectivity.
-   **Technical**: Standardizing the `syncQueue.ts` to handle generic payload types.

## 4. Technical Architecture & Data Strategy

```unicode
┌───────────────────────────────────────────────────────────┐
│                      REDUX / FIREBASE AUTH                │
└───────────────┬─────────────────────────────┬─────────────┘
                ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│      BERANDA PAGE         │   │       LOGIN PAGE          │
├───────────────────────────┤   ├───────────────────────────┤
│ ┌───────────────────────┐ │   │ ┌───────────────────────┐ │
│ │  Quick Actions (H)    │ │   │ │  Biometric Flow       │ │
│ └───────────────────────┘ │   │ └───────────────────────┘ │
│ ┌───────────────────────┐ │   │ ┌───────────────────────┐ │
│ │  Stats Widget         │ │   │ │  WebAuthn Integration │ │
│ └───────────────────────┘ │   │ └───────────────────────┘ │
│ ┌───────────────────────┐ │   └─────────────┬─────────────┘
│ │  Activity Feed (V)    │ │                 │
│ └───────────────────────┘ │                 │
└───────────────┬───────────┘                 │
                ▼                             ▼
┌───────────────────────────────────────────────────────────┐
│                  SERVICE WORKER / SYNC QUEUE              │
├───────────────────────────────────────────────────────────┤
│ [IndexedDB] Member | Visitation | Attendance              │
└──────────────────────────────┬────────────────────────────┘
                               ▼
┌───────────────────────────────────────────────────────────┐
│                     FIRESTORE DATABASE                    │
└───────────────────────────────────────────────────────────┘
```

### Component Mapping
-   **`Beranda.tsx`**: Add `QuickActions` component and `GlobalActivityFeed` section.
-   **`Login.tsx`**: Finalize `handleBiometricLogin` and `registerBiometric` integration.
-   **`AppLayout.tsx`**: Add the Floating Theme Toggle button.
-   **`syncQueue.ts`**: Update to include `member` type and `isSynced` flag logic.
-   **`sw.ts`**: Update listener to trigger background sync for all types.

### Permissions Update
-   Modify `firestore.rules` or execute a setup script to ensure `syifaudina15@gmail.com` has `role: 'admin'` and full access.
