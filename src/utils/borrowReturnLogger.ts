import { doc, setDoc, collection, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import type { User } from "firebase/auth"

export interface BorrowItem {
  equipmentId: string
  equipmentName: string
  equipmentCategory: string
  quantityBorrowed: number
  quantityReturned?: number // Actual quantity returned (for partial returns)
  quantity?: number // For consumables: actual quantity returned
  returnCondition?: string // ปกติ, ชำรุด, สูญหาย (for assets only)
  returnNotes?: string // For lost items or consumable notes
  consumptionStatus?: string // ใช้จนหมด, ใช้บางส่วน, ไม่ได้ใช้ (for consumables only)
  // Asset return breakdown
  returnGoodQty?: number
  returnDamagedQty?: number
  returnLostQty?: number
}

export interface BorrowTransaction {
  borrowId: string
  userId: string
  userEmail: string
  userName: string
  userIdNumber?: string
  borrowType: "during-class" | "teaching" | "outside"
  equipmentItems: BorrowItem[]
  borrowDate: string
  borrowTime: string
  expectedReturnDate: string
  expectedReturnTime?: string
  actualReturnDate?: string
  returnTime?: string
  conditionBeforeBorrow: string
  conditionOnReturn?: string
  damagesAndIssues?: string
  returnedBy?: string // User who initiated return
  returnedByEmail?: string
  status: "scheduled" | "borrowed" | "pending_return" | "returned" | "cancelled"
  notes?: string
  timestamp: number
  // Confirmation fields (when admin gives equipment)
  confirmedBy?: string
  confirmedByEmail?: string
  confirmedAt?: number
  // Return approval fields (when admin approves return)
  approvedBy?: string
  approvedByEmail?: string
  approvedAt?: number
  // Cancellation fields
  cancelledBy?: string
  cancelledByEmail?: string
  cancelledAt?: number
  cancelReason?: string
  // Return timestamp
  returnTimestamp?: number
}

/**
 * Log equipment borrow transaction to Firestore
 */
export async function logBorrowTransaction(
  user: User,
  borrowType: "during-class" | "teaching" | "outside",
  equipmentItems: BorrowItem[],
  borrowDate: string,
  borrowTime: string,
  expectedReturnDate: string,
  conditionBeforeBorrow: string,
  notes?: string,
  userName?: string,
  userIdNumber?: string,
  expectedReturnTime?: string
) {
  try {
    const borrowId = `borrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const transaction: BorrowTransaction = {
      borrowId,
      userId: user.uid,
      userEmail: user.email || "",
      userName: userName || user.displayName || "Unknown",
      userIdNumber: userIdNumber || "",
      borrowType,
      equipmentItems,
      borrowDate,
      borrowTime,
      expectedReturnDate,
      expectedReturnTime: expectedReturnTime || "",
      conditionBeforeBorrow,
      status: "scheduled", // Waiting for admin to confirm and give equipment
      notes: notes || "",
      timestamp: Date.now()
    }

    // Store in borrowHistory collection
    await setDoc(doc(collection(db, "borrowHistory"), borrowId), transaction)
    
    // Decrease equipment quantity when equipment is borrowed
    // This happens when status changes from "scheduled" to "borrowed" via confirmBorrowTransaction
    
    return borrowId
  } catch (error) {
    console.error("Error logging borrow transaction:", error)
    throw error
  }
}

/**
 * Decrease equipment quantity when borrow is confirmed
 */
async function decreaseEquipmentQuantity(equipmentId: string, quantityToDecrement: number) {
  try {
    console.log(`[DEBUG] Decreasing equipment ${equipmentId} by ${quantityToDecrement}`)
    const equipmentRef = doc(db, "equipment", equipmentId)
    const equipmentDoc = await getDoc(equipmentRef)
    
    if (equipmentDoc.exists()) {
      const currentQuantity = equipmentDoc.data().quantity || 0
      const newQuantity = Math.max(0, currentQuantity - quantityToDecrement)
      console.log(`[DEBUG] Current: ${currentQuantity}, New: ${newQuantity}`)
      
      await updateDoc(equipmentRef, {
        quantity: newQuantity
      })
      console.log(`[DEBUG] Successfully updated equipment ${equipmentId}`)
    } else {
      console.warn(`[DEBUG] Equipment ${equipmentId} not found in database`)
    }
  } catch (error) {
    console.error(`Error decreasing quantity for equipment ${equipmentId}:`, error)
  }
}

/**
 * Increase equipment quantity when asset is returned in normal condition
 */
async function increaseEquipmentQuantity(equipmentId: string, quantityToIncrement: number) {
  try {
    const equipmentRef = doc(db, "equipment", equipmentId)
    const equipmentDoc = await getDoc(equipmentRef)
    
    if (equipmentDoc.exists()) {
      const currentQuantity = equipmentDoc.data().quantity || 0
      const newQuantity = currentQuantity + quantityToIncrement
      
      await updateDoc(equipmentRef, {
        quantity: newQuantity
      })
    }
  } catch (error) {
    console.error(`Error increasing quantity for equipment ${equipmentId}:`, error)
  }
}

/**
 * Log equipment return transaction to Firestore
 */
export async function logReturnTransaction(
  borrowId: string,
  returnDate: string,
  returnTime: string,
  conditionOnReturn: string,
  damagesAndIssues?: string,
  returnedBy?: User,
  returnedByName?: string,
  notes?: string,
  returnedEquipmentItems?: BorrowItem[]
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    const currentData = borrowDoc.data() as BorrowTransaction
    
    // Merge equipment items with return conditions if provided
    let updatedEquipmentItems = currentData.equipmentItems
    if (returnedEquipmentItems && returnedEquipmentItems.length > 0) {
      updatedEquipmentItems = currentData.equipmentItems.map(originalItem => {
        const returnedItem = returnedEquipmentItems.find(
          item => item.equipmentId === originalItem.equipmentId && item.equipmentName === originalItem.equipmentName
        )
        if (returnedItem) {
          const updatedItem: BorrowItem = {
            ...originalItem
          }
          // Only add return-related fields if they have values
          if (returnedItem.returnCondition) {
            updatedItem.returnCondition = returnedItem.returnCondition
          }
          if (returnedItem.consumptionStatus) {
            updatedItem.consumptionStatus = returnedItem.consumptionStatus
          }
          // Save quantityReturned for admin history display (always save, even if 0)
          if (returnedItem.quantityReturned !== undefined) {
            updatedItem.quantityReturned = returnedItem.quantityReturned
          }
          if (returnedItem.returnNotes) {
            updatedItem.returnNotes = returnedItem.returnNotes
          }
          // Asset breakdown fields
          if (returnedItem.returnGoodQty !== undefined) {
            updatedItem.returnGoodQty = returnedItem.returnGoodQty
          }
          if (returnedItem.returnDamagedQty !== undefined) {
            updatedItem.returnDamagedQty = returnedItem.returnDamagedQty
          }
          if (returnedItem.returnLostQty !== undefined) {
            updatedItem.returnLostQty = returnedItem.returnLostQty
          }
          return updatedItem
        }
        return originalItem
      })
    }

    // Update equipment quantities based on return condition and equipment type
    // Only increase quantity for assets returned in normal condition
    if (returnedEquipmentItems && returnedEquipmentItems.length > 0) {
      for (const item of returnedEquipmentItems) {
        // If it's an asset and returned in normal condition, increase quantity back
        if (item.equipmentCategory === "asset" && item.returnCondition === "ปกติ") {
          await increaseEquipmentQuantity(item.equipmentId, item.quantityBorrowed)
        }
        // For consumables or broken/lost items: quantity stays decreased (already removed from inventory)
      }
    }

    // Update borrow transaction with return information
    const updateData: Partial<BorrowTransaction> = {
      actualReturnDate: returnDate,
      returnTime,
      conditionOnReturn,
      status: "pending_return",
      returnTimestamp: Date.now(),
      equipmentItems: updatedEquipmentItems,
      returnedBy: returnedByName || returnedBy?.displayName || "System"
    }
    
    // Only add optional fields if they have values
    if (damagesAndIssues) {
      updateData.damagesAndIssues = damagesAndIssues
    }
    if (notes) {
      updateData.notes = notes
    } else if (currentData.notes) {
      updateData.notes = currentData.notes
    }
    if (returnedBy?.email) {
      updateData.returnedByEmail = returnedBy.email
    }

    await setDoc(borrowDocRef, updateData, { merge: true })
  } catch (error) {
    console.error("Error logging return transaction:", error)
    throw error
  }
}

/**
 * Admin confirms and gives equipment to user
 * Changes status from "scheduled" to "borrowed"
 */
export async function confirmBorrowTransaction(
  borrowId: string,
  confirmedBy: User,
  confirmedByName?: string,
  notes?: string
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    const currentData = borrowDoc.data() as BorrowTransaction
    if (currentData.status !== "scheduled") {
      throw new Error(`Transaction is not in scheduled status. Current status: ${currentData.status}`)
    }

    // Decrease equipment quantities when confirming borrow
    for (const item of currentData.equipmentItems) {
      await decreaseEquipmentQuantity(item.equipmentId, item.quantityBorrowed)
    }

    // Update status to borrowed
    const confirmData: Partial<BorrowTransaction> = {
      status: "borrowed",
      confirmedBy: confirmedByName || confirmedBy?.displayName || "Admin",
      confirmedAt: Date.now()
    }
    
    if (confirmedBy?.email) {
      confirmData.confirmedByEmail = confirmedBy.email
    }
    if (notes) {
      confirmData.notes = notes
    } else if (currentData.notes) {
      confirmData.notes = currentData.notes
    }

    await setDoc(borrowDocRef, confirmData, { merge: true })
  } catch (error) {
    console.error("Error confirming borrow transaction:", error)
    throw error
  }
}

/**
 * Admin cancels a borrow request
 */
export async function cancelBorrowTransaction(
  borrowId: string,
  cancelledBy: User,
  cancelledByName?: string,
  reason?: string
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    // Update status to cancelled
    const cancelData: Partial<BorrowTransaction> = {
      status: "cancelled",
      cancelledBy: cancelledByName || cancelledBy?.displayName || "Admin",
      cancelledAt: Date.now()
    }
    
    if (cancelledBy?.email) {
      cancelData.cancelledByEmail = cancelledBy.email
    }
    if (reason) {
      cancelData.cancelReason = reason
    }

    await setDoc(borrowDocRef, cancelData, { merge: true })
  } catch (error) {
    console.error("Error cancelling borrow transaction:", error)
    throw error
  }
}

/**
 * Approve a pending return transaction
 */
export async function approveReturnTransaction(
  borrowId: string,
  approvedBy?: User,
  approvedByName?: string
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    const currentData = borrowDoc.data() as BorrowTransaction
    
    // Only allow approving if status is pending_return
    if (currentData.status !== "pending_return") {
      throw new Error(`Can only approve returns with pending_return status, current status: ${currentData.status}`)
    }

    // Update quantities for items and set status to returned
    if (currentData.equipmentItems && currentData.equipmentItems.length > 0) {
      for (const item of currentData.equipmentItems) {
        // If it's an asset and returned in normal condition, increase quantity back (if not already done)
        if (item.equipmentCategory === "asset" && item.returnCondition === "ปกติ") {
          await increaseEquipmentQuantity(item.equipmentId, item.quantityBorrowed)
        }
        // For consumables or broken/lost items: quantity stays decreased
      }
    }

    // Update status to returned and record approval
    const approvalData: Partial<BorrowTransaction> = {
      status: "returned",
      approvedBy: approvedByName || approvedBy?.displayName || "Admin",
      approvedAt: Date.now()
    }
    
    if (approvedBy?.email) {
      approvalData.approvedByEmail = approvedBy.email
    }

    await setDoc(borrowDocRef, approvalData, { merge: true })
  } catch (error) {
    console.error("Error approving return transaction:", error)
    throw error
  }
}

/**
 * Reject a pending return transaction (mark back as borrowed)
 */
export async function rejectReturnTransaction(
  borrowId: string,
  rejectionReason: string
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    const currentData = borrowDoc.data() as BorrowTransaction
    
    // Only allow rejecting if status is pending_return
    if (currentData.status !== "pending_return") {
      throw new Error(`Can only reject returns with pending_return status, current status: ${currentData.status}`)
    }

    // Update status back to borrowed
    const rejectionData: Partial<BorrowTransaction> = {
      status: "borrowed"
    }
    
    // Add rejection tracking in notes
    const existingNotes = currentData.notes || ""
    if (rejectionReason) {
      rejectionData.notes = existingNotes 
        ? `${existingNotes} | Return rejected: ${rejectionReason}`
        : `Return rejected: ${rejectionReason}`
    }

    await setDoc(borrowDocRef, rejectionData, { merge: true })
  } catch (error) {
    console.error("Error rejecting return transaction:", error)
    throw error
  }
}
