import { doc, setDoc, collection, getDoc, updateDoc, query, where, getDocs, writeBatch } from "firebase/firestore"
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
  assetCodes?: string[] // Equipment/asset codes for tracking specific items
  assetCodeConditions?: { code: string; condition: "ปกติ" | "ชำรุด" | "สูญหาย"; notes?: string }[] // Individual code conditions with notes
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
  status: "borrowed" | "pending_return" | "returned" | "cancelled"
  notes?: string
  timestamp: number
  // Admin acknowledgment fields (when admin acknowledges receipt)
  acknowledgedBy?: string
  acknowledgedByEmail?: string
  acknowledgedAt?: number
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
      status: "borrowed", // Item is borrowed immediately
      notes: notes || "",
      timestamp: Date.now()
    }

    // Store in borrowHistory collection
    await setDoc(doc(collection(db, "borrowHistory"), borrowId), transaction)
    
    // Mark asset codes as unavailable
    // With the new structure (Option A), each serial code is its own document
    for (const item of equipmentItems) {
      if (item.assetCodes && item.assetCodes.length > 0) {
        // Mark each serial code document as unavailable
        await markAssetCodesUnavailable(item.assetCodes)
      }
    }
    
    return borrowId
  } catch (error) {
    console.error("Error logging borrow transaction:", error)
    throw error
  }
}

/**
 * Mark specific asset codes as unavailable (borrowed)
 * NEW STRUCTURE (Option A): Each serial code is its own document
 */
async function markAssetCodesUnavailable(assetCodes: string[]) {
  try {
    // With new structure, we need to find the documents matching these serial codes
    // The document ID format is: {equipmentId}-{serialCode}
    // For now, we'll search for documents with these serial codes
    
    for (const code of assetCodes) {
      // Find all documents with this serialCode and set available: false
      const querySnapshot = await getDocs(
        query(collection(db, "equipment"), where("serialCode", "==", code))
      )
      
      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, { available: false })
      }
    }
  } catch (error) {
    console.error(`Error marking asset codes unavailable:`, error)
  }
}

/**
 * Mark specific asset codes as available (returned and approved)
 * NEW STRUCTURE (Option A): Each serial code is its own document
 */
async function markAssetCodesAvailable(_equipmentId: string, assetCodes: string[]) {
  try {
    // With new structure, find documents with these serial codes and set available: true
    for (const code of assetCodes) {
      const querySnapshot = await getDocs(
        query(collection(db, "equipment"), where("serialCode", "==", code))
      )
      
      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, { available: true })
      }
    }
  } catch (error) {
    console.error(`Error marking asset codes available:`, error)
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
          // Asset code conditions - IMPORTANT: Save per-code conditions
          if (returnedItem.assetCodeConditions && returnedItem.assetCodeConditions.length > 0) {
            updatedItem.assetCodeConditions = returnedItem.assetCodeConditions
          }
          return updatedItem
        }
        return originalItem
      })
    }

    // Update equipment quantities based on return condition and equipment type
    // For consumables: add returned quantity back to inventory
    if (returnedEquipmentItems && returnedEquipmentItems.length > 0) {
      const batch = writeBatch(db)
      
      for (const item of returnedEquipmentItems) {
        // Only update quantities for consumables
        if (item.equipmentCategory === "consumable" && item.quantityReturned !== undefined && item.quantityReturned > 0) {
          try {
            // Find equipment by name
            const q = query(collection(db, "equipment"), where("name", "==", item.equipmentName))
            const snapshot = await getDocs(q)
            
            snapshot.forEach((docSnap) => {
              const currentQty = docSnap.data().quantity || 0
              const newQty = currentQty + item.quantityReturned
              
              batch.update(doc(db, "equipment", docSnap.id), {
                quantity: newQty,
                available: newQty > 0
              })
            })
          } catch (error) {
            console.error(`Error updating quantity for ${item.equipmentName}:`, error)
          }
        }
      }
      
      await batch.commit()
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
 * Admin acknowledges receiving the borrow request
 * Records acknowledgment without changing status
 */
export async function acknowledgeAdminReceivedBorrow(
  borrowId: string,
  acknowledgedBy: User,
  acknowledgedByName?: string
) {
  try {
    const borrowDocRef = doc(db, "borrowHistory", borrowId)
    const borrowDoc = await getDoc(borrowDocRef)

    if (!borrowDoc.exists()) {
      throw new Error(`Borrow transaction with ID ${borrowId} not found`)
    }

    const currentData = borrowDoc.data() as BorrowTransaction
    if (currentData.status !== "borrowed") {
      throw new Error(`Transaction is not in borrowed status. Current status: ${currentData.status}`)
    }

    // Record admin acknowledgment
    const acknowledgeData: Partial<BorrowTransaction> = {
      acknowledgedBy: acknowledgedByName || acknowledgedBy?.displayName || "Admin",
      acknowledgedAt: Date.now()
    }
    
    if (acknowledgedBy?.email) {
      acknowledgeData.acknowledgedByEmail = acknowledgedBy.email
    }

    await setDoc(borrowDocRef, acknowledgeData, { merge: true })
  } catch (error) {
    console.error("Error acknowledging borrow transaction:", error)
    throw error
  }
}

/**
 * Keep confirmBorrowTransaction for backwards compatibility
 * @deprecated Use acknowledgeAdminReceivedBorrow instead
 */
export async function confirmBorrowTransaction(
  borrowId: string,
  confirmedBy: User,
  confirmedByName?: string
) {
  return acknowledgeAdminReceivedBorrow(borrowId, confirmedBy, confirmedByName)
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
        if (item.equipmentCategory === "asset") {
          // If we have per-code conditions, mark only normal codes as available
          if (item.assetCodeConditions && item.assetCodeConditions.length > 0) {
            const normalCodes = item.assetCodeConditions
              .filter(c => c.condition === "ปกติ")
              .map(c => c.code)
            if (normalCodes.length > 0) {
              await markAssetCodesAvailable(item.equipmentId, normalCodes)
            }
          }
        }
        // For consumables or broken/lost items: no action needed
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
