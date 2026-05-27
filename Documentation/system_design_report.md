# Proposed Design and Model

This document outlines the proposed design, system architecture, data flow, and database schemas for the **Provender** food delivery application.

---

## 5.1 High Level System Architecture Diagram

This diagram represents the high-level architecture of the Provender system, detailing how various user personas interact with the React web client and how it integrates with Supabase backend services.

### Interactive System Architecture Diagram
```mermaid
graph TD
    %% Styling
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef server fill:#bbf,stroke:#333,stroke-width:2px;
    classDef db fill:#fbf,stroke:#333,stroke-width:2px;
    classDef actor fill:#ffb,stroke:#333,stroke-width:2px;

    %% Actors
    Customer[Customer Persona]:::actor
    Owner[Kitchen Owner Persona]:::actor
    Delivery[Delivery Partner Persona]:::actor
    Admin[Administrator Persona]:::actor

    %% Frontend
    ViteClient[React + Vite Web App<br>Shadcn UI & Tailwind]:::client

    %% Backend Services
    SupaAuth[Supabase Auth<br>Authentication & Roles]:::server
    SupaDB[(Supabase PostgreSQL<br>Database Schema)]:::db
    SupaStorage[Supabase Storage<br>Image CDN]:::server

    %% Connections
    Customer -->|Web Interface| ViteClient
    Owner -->|Kitchen Dashboard| ViteClient
    Delivery -->|Delivery Console| ViteClient
    Admin -->|Admin Dashboard| ViteClient

    ViteClient -->|User Session API| SupaAuth
    ViteClient -->|Real-time Subscriptions & SQL| SupaDB
    ViteClient -->|Uploads Menu/Kitchen Images| SupaStorage
```

### Generated Image
- [View High-Level Architecture Diagram Image](file:///C:/Users/Admin/.gemini/antigravity/brain/10086d21-c3a6-4950-8fba-eaf9fe0938f4/artifacts/high_level_diagram.png)

### Prompt used to generate this image:
> *"A professional and clean high-level software system architecture diagram for a food delivery application. The diagram shows User Roles (Customer, Kitchen Owner, Delivery Partner, Admin) connecting to a React/Vite web client frontend. The frontend connects via APIs to a backend powered by Supabase (Auth, Database, Storage). The design uses a clean white background, clean blue and orange professional block components, clear connection arrows, and crisp, legible technical text. Title: 'Provender System Architecture'."*

---

## 5.2 Low Level Component & Data Flow Diagram

This diagram shows the step-by-step sequential lifecycle of an order inside the Provender application.

### Interactive Order Lifecycle Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Cart as Cart Context
    participant DB as Supabase DB (Real-time)
    actor Owner as Kitchen Owner
    actor Rider as Delivery Partner

    Customer->>Cart: Add items to Cart
    Customer->>Cart: Checkout & Confirm Address
    Cart->>DB: Insert Order (Status: pending)
    DB-->>Owner: New Order Alert (Real-time subscription)
    Owner->>DB: Accept Order (Status: preparing)
    DB-->>Customer: Order Status Alert (Preparing)
    Owner->>DB: Mark Prepared (Status: ready_for_pickup)
    DB-->>Rider: Order Available Alert
    Rider->>DB: Accept Delivery & Pick Up (Status: picked_up)
    DB-->>Customer: Real-time Map tracking active (picked_up)
    Rider->>Customer: Deliver Food
    Rider->>DB: Mark Completed (Status: delivered)
    DB-->>Customer: Request Review / Feedback
```

### Generated Image
- [View Low-Level Data Flow Diagram Image](file:///C:/Users/Admin/.gemini/antigravity/brain/10086d21-c3a6-4950-8fba-eaf9fe0938f4/artifacts/low_level_diagram.png)

### Prompt used to generate this image:
> *"A detailed data flow and sequence diagram showing the step-by-step order lifecycle in a food delivery system. Steps shown: 1. Customer places order (cart state to database) -> 2. Kitchen Owner receives order and updates status to preparing -> 3. Delivery Partner accepts order and marks as picked up -> 4. Real-time tracking updates on customer screen. The design is a clean block diagram, professional flow chart style, white background, high contrast blue/teal colors, extremely readable and formal for a college project report."*

---

## 5.3 Database Entity-Relationship (ER) Schema

This diagram represents the physical layout of the database tables and schemas stored in Supabase.

### Schema Relationships
```mermaid
erDiagram
    profiles {
        uuid id PK
        text display_name
        text email
        text phone
        timestamp created_at
    }
    restaurants {
        uuid id PK
        text name
        text description
        text cuisine
        text image_url
        float rating
        int price_for_two
        int delivery_minutes
        text city
        uuid owner_id FK
    }
    menu_items {
        uuid id PK
        uuid restaurant_id FK
        text name
        text description
        numeric price
        text image_url
        text category
        boolean is_available
    }
    orders {
        uuid id PK
        uuid customer_id FK
        uuid restaurant_id FK
        text status
        numeric total_amount
        text delivery_address
        uuid delivery_partner_id FK
        timestamp created_at
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        int quantity
        numeric price
    }
    reviews {
        uuid id PK
        uuid customer_id FK
        uuid restaurant_id FK
        uuid order_id FK
        int rating
        text comment
        timestamp created_at
    }

    profiles ||--o{ restaurants : "owns (owner_id)"
    restaurants ||--|{ menu_items : "offers"
    profiles ||--o{ orders : "places (customer_id)"
    restaurants ||--o{ orders : "receives"
    orders ||--|{ order_items : "contains"
    menu_items ||--o{ order_items : "ordered_in"
    profiles ||--o{ reviews : "writes"
    restaurants ||--o{ reviews : "reviewed_in"
    orders ||--o| reviews : "rated_in"
```
