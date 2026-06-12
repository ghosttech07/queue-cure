# Queue Cure – Thought Process Sheet

## Problem Statement

A large number of clinics in India still rely on paper token systems and manual queue management. Patients often wait for long periods without knowing when they will be called, leading to frustration and overcrowded waiting areas. Receptionists must manually track patient order, increasing the chances of errors and delays.

## Our Solution

Queue Cure is a real-time clinic queue management system that digitizes the patient waiting process. It provides a dedicated dashboard for receptionists to manage patient flow and a live waiting room view that allows patients to track their position in the queue, estimated waiting time, and current token being served.

The primary goal is to improve transparency, reduce uncertainty, and streamline clinic operations through real-time synchronization.

## System Design

The application consists of two main interfaces:

### Receptionist Dashboard

* Add new patients
* Generate token numbers automatically
* Call the next patient
* Configure average consultation time
* View queue analytics
* Manage patient flow efficiently

### Patient Waiting Room

* View current token being served
* See tokens ahead in the queue
* Track estimated waiting time
* Receive live updates without refreshing the page

## Wait Time Calculation

Queue Cure calculates waiting time dynamically using real queue data.

**Formula:**

```
Estimated Wait Time = Tokens Ahead × Average Consultation Time
```

**Example:**

| Field | Value |
|---|---|
| Current Token | 10 |
| Patient Token | 15 |
| Average Consultation Time | 10 Minutes |
| Tokens Ahead | 15 − 10 = 5 |
| **Estimated Wait Time** | **5 × 10 = 50 Minutes** |

This approach ensures that waiting times automatically adjust as the queue progresses.

## Real-Time Synchronization

The application uses Supabase Realtime to synchronize data between all connected clients.

Whenever the receptionist performs an action such as:

* Adding a patient
* Calling the next token
* Updating queue settings

Supabase instantly broadcasts the changes to all connected waiting room screens.

**Benefits:**

* No page refresh required
* Instant queue visibility
* Consistent data across devices
* Better patient experience

## Database Design

### Patients Table

Stores:

* Patient Name
* Token Number
* Status
* Creation Timestamp

### Queue Configuration Table

Stores:

* Current Token
* Average Consultation Time
* Last Updated Timestamp

This separation keeps queue settings independent from patient records and improves maintainability.

## Edge Cases Considered

### Empty Queue

The system prevents calling the next token when no patients are waiting.

### Browser Refresh

Queue state is stored in Supabase, ensuring data persists after refreshes.

### Multiple Connected Users

Realtime synchronization ensures every connected device receives the latest queue information instantly.

### Long Waiting Times

Patients receive dynamically calculated waiting estimates to reduce uncertainty.

### Network Reconnection

When a user reconnects, the latest queue state is automatically loaded from the database.

## Why Supabase?

Supabase was selected because it provides:

* PostgreSQL database
* Realtime subscriptions
* Secure API access
* Rapid development workflow
* Easy deployment and scalability

Using Supabase reduced development complexity while enabling reliable real-time communication between screens.

## Future Improvements

* Multi-doctor support
* Appointment scheduling
* SMS and WhatsApp notifications
* Token booking before arrival
* Queue analytics and reporting
* Multi-clinic management

## Conclusion

Queue Cure successfully replaces manual clinic queue management with a real-time digital solution. By combining live synchronization, automatic wait time estimation, and an intuitive user interface, the system improves both patient experience and receptionist efficiency while remaining simple, scalable, and practical for real-world clinic environments.
