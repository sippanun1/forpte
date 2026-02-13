# Equipment Borrow/Return Logging Integration Guide

## Overview
This guide explains how to integrate equipment borrow and return logging into your existing borrow and return pages using Firebase.

## Setup
The logging system is already created in two files:
- **`src/utils/borrowReturnLogger.ts`** - Utility functions for logging transactions
- **`src/pages/Admin/BorrowReturnHistory.tsx`** - Admin page to view all borrow/return history
- **`src/pages/BorrowReturnHistory.tsx`** - User-accessible history page

## Data Structure

### BorrowTransaction
```typescript
{
  borrowId: string                      // Unique identifier
  userEmail: string                     // User's email
  userName: string                      // User's full name
  userIdNumber?: string                 // Student/Employee ID
  borrowType: "during-class" | "teaching" | "outside"
  equipmentItems: {
    equipmentId: string
    equipmentName: string
    equipmentCategory: string
    quantityBorrowed: number
  }[]
  borrowDate: string                    // Format: "DD/MM/YYYY"
  borrowTime: string                    // Format: "HH:MM"
  expectedReturnDate: string            // Format: "DD/MM/YYYY"
  actualReturnDate?: string             // Only set when returned
  returnTime?: string                   // Only set when returned
  conditionBeforeBorrow: string         // Equipment condition when borrowed
  conditionOnReturn?: string            // Equipment condition when returned
  damagesAndIssues?: string             // Any damages found on return
  returnedBy?: string                   // Name of person who processed return
  returnedByEmail?: string              // Email of person who processed return
  status: "borrowed" | "returned"
  notes?: string
  timestamp: number                     // When borrowed (ms)
  returnTimestamp?: number              // When returned (ms)
}
```

## Integration Steps

### 1. Add Logging to Borrow Completion Page (CompletionPage.tsx)

After the user confirms their borrow, call the logging function:

```typescript
import { logBorrowTransaction } from "../../utils/borrowReturnLogger"
import { useAuth } from "../../hooks/useAuth"

export default function CompletionPage({ cartItems, setCartItems }: CompletionPageProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleConfirmBorrow = async () => {
    try {
      // Log the borrow transaction
      const borrowId = await logBorrowTransaction(
        user!,
        "during-class", // or "teaching", "outside" - depends on borrow type
        cartItems.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
          equipmentCategory: item.category,
          quantityBorrowed: item.selectedQuantity
        })),
        "06/02/2569", // borrow date
        "10:30",      // borrow time
        "10/02/2569", // expected return date
        "ดีเยี่ยม",   // condition before borrow (จากการตรวจสอบ)
        undefined,    // notes
        user?.displayName,
        userIdNumber  // if available
      )

      // Clear cart and navigate
      setCartItems([])
      navigate("/home")
    } catch (error) {
      console.error("Error logging borrow:", error)
      alert("ไม่สามารถบันทึกการยืมได้")
    }
  }

  return (
    // ... existing JSX
  )
}
```

### 2. Add Logging to Return Page (ReturnSummary.tsx)

When user returns equipment, call the return logging function:

```typescript
import { logReturnTransaction } from "../../utils/borrowReturnLogger"
import { useAuth } from "../../hooks/useAuth"

export default function ReturnSummary({ returnEquipment, setReturnEquipment }: ReturnSummaryProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleConfirmReturn = async (borrowId: string) => {
    try {
      // Log the return transaction
      await logReturnTransaction(
        borrowId,
        "06/02/2569", // return date
        "15:30",      // return time
        "ดีเยี่ยม",   // condition on return
        undefined,    // damages and issues (if any)
        user,         // user who processed return
        undefined,    // returned by name
        undefined     // notes
      )

      // Clear and navigate
      setReturnEquipment([])
      navigate("/home")
    } catch (error) {
      console.error("Error logging return:", error)
      alert("ไม่สามารถบันทึกการคืนได้")
    }
  }

  return (
    // ... existing JSX
  )
}
```

## Field Descriptions

### Condition Options
Typical condition values for `conditionBeforeBorrow` and `conditionOnReturn`:
- **ดีเยี่ยม** - Excellent condition
- **ดี** - Good condition
- **ปกติ** - Average condition
- **มีรอยขยี้** - Has minor scratches
- **มีการเสียหาย** - Damaged

### Borrow Type
- **during-class** - Borrow during class time
- **teaching** - Borrow for teaching purposes
- **outside** - Borrow outside class time

### Damage Description
Provide detailed information like:
- เหมือนเดิม (Same as before)
- มีรอยขูดเล็กน้อย (Minor scratches)
- หน้าจอแตก (Screen cracked)
- อุปกรณ์ไม่ทำงาน (Device not working)

## Viewing Borrow/Return History

### For Users
Users can view their own borrow/return history by:
1. Going to their home page
2. Option: Add a "View My Borrow History" button that navigates to `/borrow-return-history`

### For Admins
Admins can view all borrow/return history via:
- Admin Dashboard → View Borrow/Return History
- Route: `/admin/borrow-return-history`
- Features:
  - Filter by status (borrowed, returned, all)
  - Search by user name, email, or equipment name
  - View detailed transaction information
  - See damage reports

## Firebase Firestore Structure

The system creates a `borrowHistory` collection with documents containing all borrow/return information:

```
firestore/
├── borrowHistory/
│   ├── borrow-1707206400000-abc123def
│   │   ├── borrowId: "borrow-1707206400000-abc123def"
│   │   ├── userEmail: "student@school.com"
│   │   ├── userName: "สมชายสมหวัง"
│   │   ├── borrowType: "during-class"
│   │   ├── equipmentItems: [...]
│   │   ├── borrowDate: "06/02/2569"
│   │   ├── borrowTime: "10:30"
│   │   ├── expectedReturnDate: "10/02/2569"
│   │   ├── status: "borrowed"
│   │   └── timestamp: 1707206400000
│   └── [more records...]
```

## Error Handling

Always wrap logging calls in try-catch:

```typescript
try {
  const borrowId = await logBorrowTransaction(...)
  // Continue with success logic
} catch (error) {
  console.error("Logging error:", error)
  // Show user-friendly error message
  alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่")
}
```

## Security Considerations

Make sure to set Firebase Firestore rules to:
1. Allow users to read their own borrow records
2. Allow admins to read all borrow records
3. Only app can write to borrowHistory (not users directly)

Example rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /borrowHistory/{document=**} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userEmail || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if false; // Only backend writes
    }
  }
}
```

## Future Enhancements

- Add email notifications when items are due for return
- Automatic reminder for late returns
- Equipment availability tracking
- Damage report tracking with photos
- Integration with inventory management
