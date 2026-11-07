# Sprint 1 Test Execution Report

**Tester:** Ylthea Villanueva  
**Date:** November 7, 2026  
**Project:** KATSEYE Hope ERP  

---

## Task Execution Summary

| Task ID | Description | Test Result | Notes / Details |
| :--- | :--- | :--- | :--- |
| **S1-TST-01** | Sprint 1 Test Plan & Acceptance Criteria | **PASSED** | Core user management and authentication requirements defined and verified. |
| **S1-TST-02** | Test cases: Register, Login, Logout, Reset Password | **PASSED** | Successfully registered users, logged in with valid credentials, and signed out. |
| **S1-TST-03** | Test cases: User Management (Add, Edit, Block/Unblock, Approve) | **PASSED** | "Edit User" modal correctly updates First/Last Name, Role dropdown, and Status options (Active, Pending, Blocked, Disapproved). |
| **S1-TST-04** | Permission Matrix (Superadmin / Admin / User) | **PASSED** | Admin role grants access to /users dashboard and administration sidebar. |
| **S1-TST-05** | Automated/Manual Smoke Test (Login & Main Page) | **PASSED** | Application loads cleanly at http://localhost:5173/, routing works without system crashes. |
| **S1-TST-06** | Bug Reports & Fix Verification | **PASSED** | Key user management paths and user state toggles verified as functional. |

---

## Detailed Test Scenarios

### 1. Authentication (S1-TST-02)
- [x] **Login:** User can sign in with admin credentials.
- [x] **Logout:** Sign-out button clears session and redirects to /login.

### 2. User Management Modal (S1-TST-03)
- [x] **Edit Details:** Editable fields for First Name and Last Name.
- [x] **Role Switching:** Ability to set role to User or Admin.
- [x] **Status Toggling:** Ability to set status to Active, Pending, Blocked, or Disapproved.
