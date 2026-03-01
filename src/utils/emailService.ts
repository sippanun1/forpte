import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase/firebase'

export interface Member {
  id: string
  name: string
  studentId: string
}

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
  members?: Member[]
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
    // Format members list
    const membersList = data.members && data.members.length > 0
      ? data.members
          .map((member, index) => `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.name}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.studentId}</td></tr>`)
          .join('')
      : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #999;">ยังไม่มีข้อมูลสมาชิก</td></tr>'

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
              <p><strong>จำนวนคนทั้งหมด:</strong> ${data.people} คน</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
            </div>

            <h3 style="color: #333; margin-top: 20px;">รายชื่อสมาชิก</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #FF7F50; color: white;">
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ลำดับที่</th>
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ชื่อ-นามสกุล</th>
                  <th style="padding: 10px; text-align: left;">เลขประจำตัว</th>
                </tr>
              </thead>
              <tbody>
                ${membersList}
              </tbody>
            </table>

            <p style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <strong>⏰ สูงสุด 4 ชั่วโมง:</strong> ระยะเวลาจองห้องสูงสุด 4 ชั่วโมง
            </p>

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
    // Format members list
    const membersList = data.members && data.members.length > 0
      ? data.members
          .map((member, index) => `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.name}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.studentId}</td></tr>`)
          .join('')
      : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #999;">ยังไม่มีข้อมูลสมาชิก</td></tr>'

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
              <p><strong>จำนวนคนทั้งหมด:</strong> ${data.people} คน</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
            </div>

            <h3 style="color: #2e7d32;">รายชื่อสมาชิก</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #4CAF50; color: white;">
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ลำดับที่</th>
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ชื่อ-นามสกุล</th>
                  <th style="padding: 10px; text-align: left;">เลขประจำตัว</th>
                </tr>
              </thead>
              <tbody>
                ${membersList}
              </tbody>
            </table>

            <p style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <strong>⏰ สำคัญ:</strong> กรุณาเข้าใช้ห้องตามเวลาที่กำหนด (เวลาสูงสุด 4 ชั่วโมง) และดูแลอุปกรณ์ให้เรียบร้อย
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

export async function sendRoomBookingRejectionToUser(data: RoomBookingEmailData & { rejectionReason?: string }): Promise<{ success: boolean; message: string }> {
  try {
    // Format members list
    const membersList = data.members && data.members.length > 0
      ? data.members
          .map((member, index) => `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.name}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.studentId}</td></tr>`)
          .join('')
      : '<tr><td colspan="3" style="padding: 8px; text-align: center; color: #999;">ยังไม่มีข้อมูลสมาชิก</td></tr>'

    await addDoc(collection(db, 'mail'), {
      to: data.userEmail,
      message: {
        subject: `คำขอจองห้องของท่านไม่ได้รับการอนุมัติ`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c62828;">❌ คำขอจองห้องของท่านไม่ได้รับการอนุมัติ</h2>
            <p>เรียน คุณ ${data.userName}</p>
            <p>ขออภัยที่แจ้งว่า คำขอจองห้องของท่านในวันที่ <strong>${data.date}</strong> เวลา <strong>${data.startTime} - ${data.endTime}</strong> ไม่ได้รับการอนุมัติ</p>
            
            <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c62828;">
              <h3 style="color: #c62828; margin-top: 0;">รายละเอียดการจอง</h3>
              <p><strong>ชื่อห้อง:</strong> ${data.roomName}</p>
              <p><strong>วันที่:</strong> ${data.date}</p>
              <p><strong>เวลา:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>จำนวนคนทั้งหมด:</strong> ${data.people} คน</p>
              <p><strong>วัตถุประสงค์:</strong> ${data.objective}</p>
            </div>

            <h3 style="color: #c62828;">รายชื่อสมาชิก</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #ef5350; color: white;">
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ลำดับที่</th>
                  <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">ชื่อ-นามสกุล</th>
                  <th style="padding: 10px; text-align: left;">เลขประจำตัว</th>
                </tr>
              </thead>
              <tbody>
                ${membersList}
              </tbody>
            </table>

            ${data.rejectionReason ? `
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
              <h3 style="color: #e65100; margin-top: 0;">เหตุผล</h3>
              <p>${data.rejectionReason}</p>
            </div>
            ` : ''}

            <p style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
              กรุณาทำรายการจองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบเพื่อสอบถามรายละเอียดเพิ่มเติม
            </p>
            
            <p>ขอบคุณค่ะ/ครับ</p>
          </div>
        `
      }
    })

    return {
      success: true,
      message: 'ส่งอีเมลแจ้งการปฏิเสธสำเร็จแล้ว'
    }
  } catch (error) {
    console.error('Error sending rejection email:', error)
    return {
      success: false,
      message: 'ขออภัย เกิดข้อผิดพลาดในการส่งอีเมล'
    }
  }
}
