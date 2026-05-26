# 📊 Workflows & System Diagrams

This document contains Mermaid diagrams illustrating the primary workflows, actors, and state transitions within the Provender platform.

---

## 1. System Use Case Diagram
This flowchart maps the different actors (Customer, Kitchen Owner, and Delivery Partner) to their key interaction capabilities within the system.

```mermaid
graph TD
    subgraph Actors
        Customer["👤 Customer"]
        Owner["👨‍🍳 Kitchen Owner"]
        Partner["🚴 Delivery Partner"]
    end

    subgraph "Core Functionality"
        UC1(["Browse Restaurants & Menus"])
        UC2(["Add Items & Place Order"])
        UC3(["Track Order Live"])
        UC4(["Manage Menu Items"])
        UC5(["Manage Orders (Prepare/Ready)"])
        UC6(["Approve Onboarding Requests"])
        UC7(["Onboarding Request Submission"])
        UC8(["Accept Orders for Delivery"])
        UC9(["Share Live Location & Status"])
    end

    Customer --> UC1
    Customer --> UC2
    Customer --> UC3

    Owner --> UC4
    Owner --> UC5
    Owner --> UC6

    Partner --> UC7
    Partner --> UC8
    Partner --> UC9
```

---

## 2. Order Lifecycle Activity Diagram
This state diagram represents the sequence of statuses an order undergoes from the initial customer placement through the kitchen prep and courier delivery.

```mermaid
stateDiagram-v2
    [*] --> Pending : Customer places order
    Pending --> Accepted : Owner accepts order
    Accepted --> Preparing : Owner starts preparing
    Preparing --> Ready : Owner marks food ready
    Ready --> Assigned : Delivery partner accepts order
    Assigned --> PickedUp : Partner picks up food
    PickedUp --> OnTheWay : Partner is on the way
    OnTheWay --> Delivered : Partner delivers food
    Delivered --> [*]
```

---

## 3. Delivery Partner Onboarding Sequence Diagram
This sequence diagram shows the message exchanges and database status checks between a delivery partner, the Supabase database/backend, and a kitchen owner during the onboarding phase.

```mermaid
sequenceDiagram
    autonumber
    actor Delivery as Delivery Partner
    participant DB as Supabase Database
    actor Owner as Kitchen Owner

    Delivery->>DB: Submit onboarding request (selected restaurant_id)
    Note over DB: Record saved in 'delivery_relationships' with status 'pending'
    Owner->>DB: Load dashboard & check "Delivery Staff" requests
    DB-->>Owner: Return pending onboarding list
    Owner->>DB: Approve request (relationship ID)
    Note over DB: Status updated to 'approved'
    Delivery->>DB: Fetch active relationship status
    DB-->>Delivery: Return 'approved' status
    Delivery->>DB: Get available orders from approved kitchen
    DB-->>Delivery: Return list of orders marked 'ready'
```
