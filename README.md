# Provender - Premium Food Delivery Platform

Provender is a modern, high-performance web application that connects customers with local kitchens and professional delivery partners. It features a complete marketplace, an analytics dashboard for kitchen owners, and an onboarding and assignment workflow for delivery staff.

---

## 🛠️ Technology Stack

The application is built using a modern, scalable stack optimized for performance and real-time updates:

*   **Frontend Library**: [React 18](https://react.dev/) (Functional components, custom hooks, and context state management).
*   **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type-checking for database schemas and client state).
*   **Build Tool**: [Vite](https://vite.dev/) (Sub-second hot-module replacement and optimized asset code-splitting via `React.lazy`).
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Responsive layouts, custom grid systems, and animations) along with custom premium tokens.
*   **Database & Backend**: [Supabase](https://supabase.com/) (PostgreSQL database, Row Level Security (RLS) policies, and Realtime WebSocket subscriptions).
*   **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest) (Server state synchronization and automatic caching).
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI primitives for dialogs, custom tabs, switches, and toasts).
*   **Icons**: [Lucide React](https://lucide.dev/) (Premium line icon set).

---

## 📂 Core Component Architecture

The codebase is organized into modular pages and reusable layouts:

1.  **`Layout.tsx` (Global Navigation)**: Dynamically adjusts its navigation items based on the user's active role. Features like "Favourites" and "Address Book" are hidden for kitchen owners to clean up their interface.
2.  **`Auth` & `Recovery`**: Implements customer registration, role assignment, and secure password recovery flows.
3.  **`Index.tsx` (Marketplace)**: Provides restaurant search, categorization filters, and a real-time list of active food kitchens.
4.  **`RestaurantDetail.tsx` (Menu Browser)**: Displays categorized dishes and handles real-time shopping cart additions.
5.  **`Checkout.tsx` (Order Settlement)**: Handles delivery address selection (existing or new), special delivery instructions, payment method selection, and custom ETA estimations based on the kitchen's delivery statistics.
6.  **`OrderTracking.tsx` (Real-time Tracker)**: Subscribes to changes in order status and delivery geolocation coordinates to display live updates to the customer.
7.  **`OwnerDashboard.tsx` (Kitchen Management)**: 
    *   **Revenue Analytics**: Real-time sales calculations.
    *   **Order Control Room**: Transition orders through states: `pending` → `accepted` → `preparing` → `ready`.
    *   **Menu Editor**: Add, modify, toggle availability, or remove dishes.
    *   **Delivery Staff Approvals**: Review, approve, or reject onboarding requests from delivery partners.
8.  **`DeliveryDashboard.tsx` (Logistics)**:
    *   **Kitchen Connection Request**: Submit joining requests to desired kitchens.
    *   **Delivery Feed**: Accept available orders originating from approved restaurants.
    *   **Real-time Handlers**: Update deliveries to `picked_up` → `on_the_way` → `delivered` and share GPS coordinates.

---

## 🔄 Step-by-Step System Workflow

```
[Customer]             [Kitchen Owner]            [Delivery Partner]
    │                         │                           │
    ├─► Browse & Order ───────┼───────────────────────────┤ (Onboarding Request)
    │                         │◄──────────────────────────┤
    │                         ├─► Approve Partner         │
    │                         │                           │
    ├─► Placed Order ────────►│                           │
    │                         ├─► Prepare Food            │
    │                         ├─► Food Ready              │
    │                         │                           │
    │                         └─► Appears on Feed ───────►│
    │                                                     ├─► Accept Delivery
    │                                                     ├─► Pick Up Order
    │                                                     ├─► Update Geolocation
    │◄────────────────────────────────────────────────────┼─► Deliver Order
    ▼                                                     ▼
```

### 1. Delivery Partner Onboarding
*   A new delivery user signs up and navigates to the **Delivery Dashboard**.
*   The partner selects a kitchen (e.g. *Dominos*) and submits an association request.
*   The kitchen owner views this request under the **"Delivery Staff"** tab and click **"Approve"**. 
*   Once approved, the delivery partner gains access to the live delivery queue for that kitchen.

### 2. Ordering & Custom ETA
*   A customer adds items to their cart, selects an address, and places an order.
*   The checkout component queries the restaurant's claimed `delivery_minutes` to calculate a dynamic ETA.
*   The system creates an order record and inserts a corresponding entry into the `deliveries` table.

### 3. Kitchen Processing
*   The kitchen owner is notified in real-time about the new order.
*   The owner moves the status from `pending` to `accepted`, then `preparing`, and finally `ready`.

### 4. Courier Pickup & Hand-off
*   When the food is marked `ready`, it appears on the approved delivery partner's **"Available Pickups"** feed.
*   The partner clicks **"Accept"** to claim the order.
*   As the courier updates the status (`picked_up` → `on_the_way` → `delivered`) and shares their current location, the customer tracks the delivery progress in real-time.
