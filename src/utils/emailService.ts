import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase/firebase'

export interface BorrowEmailData {
  userEmail: string
  userName: string
  equipmentNames: string[]
  borrowDate: string
  borrowTime: string
  expectedReturnDate: string
  expectedReturnTime?: string
  borrowType: string
}

export interface RoomBookingEmailData {
  adminEmail: string
  userEmail: string
  userName: string
  roomName: string
  date: string
  startTime: string
  endTime: string
  people: number
  objective: string
  userId: string
}

export async function sendBorrowAcknowledgmentEmail(data: BorrowEmailData): Promise<{ success: boolean; message: string }> {
  try {
    await addDoc(collection(db, 'mail'), {
      to: data.userEmail,
      message: {
        subject: `ยืนยันการยืมอุปกรณ์ - ${data.equipmentNames.join(', ')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📋 ยืนยันการยืมอุปกรณ์</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>ชื่อผู้ใช้:</strong> ${data.userName}</p>
              <p><strong>อุปกรณ์:</strong> ${data.equipmentNames.join(', ')}</p>
              <p><strong>วันที่ยืม:</strong> ${data.borrowDate} ${data.borrowTime}</p>
              <p><strong>วันคืนคาดว่า:</strong> ${data.expectedReturnDate} ${data.expectedReturnTime || ''}</p>
              <p><strong>ประเภทการยืม:</strong> ${data.borrowType}</p>
            </div>
            <p>ขอบคุณที่ใช้บริการของเรา</p>
          </div>
        `
      }
    })

    return {
      success: true,
      message: 'ส่งอีเมลสำเร็จแล้ว'
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      message: 'ขออภัย เกิดข้อผิดพลาดในการส่งอีเมล'
    }
  }
}

// Room Booking Email - Using Firebase Extension
export async function sendRoomBookingEmailToAdmin(data: RoomBookingEmailData): Promise<{ success: boolean; message: string }> {
  try {
    await addDoc(collection(db, 'mail'), {
      to: data.adminEmail,
      message: {
        subject: `🎉 มีการจองห้องใหม่ - ${data.roomName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📋 การจองห้องใหม่</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>ชื่อผู้ใช้:</strong> ${data.userName}</p>
              <p><strong>อีเมล:</strong> ${data.userEmail}</p>
              <p><strong>ID ผู้ใช้:</strong> ${data.userId}</p>
              <p><strong>ห้อง:</strong> ${data.roomName}</p>
              <p><strong>วันที่:</strong> ${data.date}</p>
              <p><strong>เวลา:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>จำนวนคน:</strong> ${data.people}</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
            </div>
            <p>กรุณาตรวจสอบและอนุมัติการจองนี้</p>
          </div>
        `
      }
    })

    return {
      success: true,
      message: 'ส่งอีเมลแจ้งแอดมินสำเร็จแล้ว'
    }
  } catch (error) {
    console.error('Error sending admin email:', error)
    return {
      success: false,
      message: 'ขออภัย เกิดข้อผิดพลาดในการส่งอีเมล'
    }
  }
}

export async function sendRoomBookingConfirmationToUser(data: RoomBookingEmailData): Promise<{ success: boolean; message: string }> {
  try {
    await addDoc(collection(db, 'mail'), {
      to: data.userEmail,
      message: {
        subject: `ยืนยันการจองห้อง - ${data.roomName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">✅ ยืนยันการจองห้อง</h2>
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>ชื่อห้อง:</strong> ${data.roomName}</p>
              <p><strong>วันที่:</strong> ${data.date}</p>
              <p><strong>เวลา:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>จำนวนคน:</strong> ${data.people}</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
              <p><strong>สถานะ:</strong> รอการอนุมัติ</p>
            </div>
            <p>ขอบคุณที่ใช้บริการของเรา กรุณารอการอนุมัติจากผู้ดูแลระบบ</p>
          </div>
        `
      }
    })

    return {
      success: true,
      message: 'ส่งอีเมลยืนยันสำเร็จแล้ว'
    }
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    return {
      success: false,
      message: 'ขออภัย เกิดข้อผิดพลาดในการส่งอีเมล'
    }
  }
}
