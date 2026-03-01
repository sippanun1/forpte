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
        subject: `มีคำขอจองห้องใหม่รอการอนุมัติ - ${data.roomName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📋 มีคำขอจองห้องใหม่รอการอนุมัติ</h2>
            <p>เรียน ผู้ดูแลระบบ</p>
            <p>มีคำขอจองห้องใหม่เข้าสู่ระบบ กรุณาตรวจสอบรายละเอียดด้านล่าง:</p>
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
        subject: `คำขอจองห้องของท่านได้รับการอนุมัติแล้ว`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2e7d32;">✅ คำขอจองห้องของท่านได้รับการอนุมัติแล้ว</h2>
            <p>เรียน คุณ ${data.userName}</p>
            <p>คำขอจองห้องของท่านได้รับการอนุมัติเรียบร้อยแล้ว</p>
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
              <h3 style="color: #2e7d32; margin-top: 0;">รายละเอียดการจอง</h3>
              <p><strong>ชื่อห้อง:</strong> ${data.roomName}</p>
              <p><strong>วันที่:</strong> ${data.date}</p>
              <p><strong>เวลา:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>จำนวนคน:</strong> ${data.people}</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
            </div>
            <p style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <strong>⏰ สำคัญ:</strong> กรุณาเข้าใช้ห้องตามเวลาที่กำหนด และดูแลอุปกรณ์ให้เรียบร้อย
            </p>
            <p>ขอบคุณที่ใช้บริการของเรา</p>
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
