# Equipment Borrow/Return Firebase Integration - Summary

## ✅ What's Been Created

### 1. **Logging Utility** (`src/utils/borrowReturnLogger.ts`)
Functions to store borrow and return transactions in Firebase:
- `logBorrowTransaction()` - Records when equipment is borrowed
- `logReturnTransaction()` - Records when equipment is returned

**Data Collected:**
- User info (email, name, ID number)
- Equipment details (name, category, quantity)
- Borrow date/time and expected return date
- Equipment condition before and after use
- Damage/issue documentation
- Return date/time and who processed the return

### 2. **Admin History Page** (`src/pages/Admin/BorrowReturnHistory.tsx`)
View all borrow/return transactions with:
- **Filter by Status**: All / Still Borrowed / Returned
- **Search**: Find by user name, email, or equipment name
- **Detailed View**: Complete transaction details including:
  - User information
  - Borrow type (during class, teaching, outside)
  - Equipment borrowed
  - Dates and times
  - Condition reports
  - Damage documentation
  - Who processed the return

**Route**: `/admin/borrow-return-history`

### 3. **User History Page** (`src/pages/BorrowReturnHistory.tsx`)
Same history view accessible to all users to check their own borrow/return records.

**Route**: `/borrow-return-history`

### 4. **Updated Home Page** (`src/pages/Home.tsx`)
Added new button to access borrow/return history
- Button: "ประวัติการยืมและคืน"
- Accessible from user dashboard

### 5. **Firebase Firestore Structure**
New `borrowHistory` collection created with documents containing:
```
borrowHistory/
├── borrow-timestamp-randomid/
│   ├── borrowId
│   ├── userEmail
│   ├── userName
│   ├── userIdNumber
│   ├── borrowType
│   ├── equipmentItems[]
│   ├── borrowDate
│   ├── borrowTime
│   ├── expectedReturnDate
│   ├── actualReturnDate
│   ├── returnTime
│   ├── conditionBeforeBorrow
│   ├── conditionOnReturn
│   ├── damagesAndIssues
│   ├── returnedBy
│   ├── status
│   └── timestamp
```

## 📋 How to Integrate

### Step 1: Add Logging to CompletionPage (Borrow Confirmation)
Update `src/pages/BorrowEquipment/CompletionPage.tsx`:

```typescript
import { logBorrowTransaction } from "../../utils/borrowReturnLogger"
import { useAuth } from "../../hooks/useAuth"

export default function CompletionPage({ cartItems, setCartItems }: CompletionPageProps) {
  const { user } = useAuth()
  
  const handleBorrowConfirm = async () => {
    try {
      await logBorrowTransaction(
        user!,
        "during-class", // or "teaching", "outside"
        cartItems.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
          equipmentCategory: item.category,
          quantityBorrowed: item.selectedQuantity
        })),
        borrowDate, // e.g., "06/02/2569"
        borrowTime, // e.g., "10:30"
        returnDate, // e.g., "10/02/2569"
        "ดีเยี่ยม", // condition
        notes
      )
      
      // Clear and navigate
      setCartItems([])
      navigate("/home")
    } catch (error) {
      console.error("Error logging borrow:", error)
    }
  }
}
```

### Step 2: Add Logging to ReturnSummary (Return Confirmation)
Update `src/pages/ReturnEquipment/ReturnSummary.tsx`:

```typescript
import { logReturnTransaction } from "../../utils/borrowReturnLogger"
import { useAuth } from "../../hooks/useAuth"

export default function ReturnSummary() {
  const { user } = useAuth()
  
  const handleReturnConfirm = async (borrowId: string) => {
    try {
      await logReturnTransaction(
        borrowId,
        returnDate, // e.g., "10/02/2569"
        returnTime, // e.g., "15:30"
        "ดีเยี่ยม", // condition on return
        damagesAndIssues, // optional
        user,
        userName, // optional
        notes
      )
      
      // Clear and navigate
      setReturnEquipment([])
      navigate("/home")
    } catch (error) {
      console.error("Error logging return:", error)
    }
  }
}
```

## 🔍 Features Available Now

### For All Users
✅ View personal borrow/return history
✅ Filter by status (borrowed/returned)
✅ Search by equipment, user name, email
✅ See detailed transaction information
✅ Track equipment conditions and damage reports

### For Admins (via `/admin/borrow-return-history`)
✅ View ALL user borrow/return transactions
✅ Monitor equipment currently out on loan
✅ Track damage reports and condition issues
✅ Search and filter historical data
✅ Verify return dates and who processed returns

## 📊 Data Fields Explained

**Borrowed Equipment Condition Options:**
- ดีเยี่ยม (Excellent)
- ดี (Good)
- ปกติ (Fair)
- มีรอยขยี้ (Has scratches)
- มีการเสียหาย (Damaged)

**Borrow Types:**
- during-class: ยืมในคาบเรียน
- teaching: ยืมใช้สอน
- outside: ยืมนอกคาบเรียน

## 🔐 Security Recommendations

Set Firestore security rules to:
1. Allow users to read only their own records
2. Allow admins to read all records
3. Prevent users from directly writing to borrowHistory
4. Only app backend can write to borrowHistory

## 🚀 Next Steps

1. **Test the Integration**
   - Complete a borrow transaction and verify data appears in history
   - Complete a return transaction and verify status updates

2. **Customize Data Fields** (if needed)
   - Adjust equipment categories
   - Add additional metadata
   - Customize condition descriptions

3. **Enable Notifications** (future)
   - Email reminders for upcoming return dates
   - Alerts for overdue items
   - Damage reports

4. **Generate Reports** (future)
   - Equipment usage statistics
   - Most borrowed items
   - Damage/loss reports
   - User borrowing patterns

## 📞 Support

For questions on integration:
1. Check `BORROW_RETURN_LOGGING_GUIDE.md` for detailed instructions
2. Review the type definitions in `src/utils/borrowReturnLogger.ts`
3. Check example implementations in AdminManageEquipment.tsx for logging patterns
