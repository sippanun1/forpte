import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase/firebase"
import Header from "../components/Header"
import type { RegisterForm } from "../types/auth"

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    idNumber: "",
    undergraduateYears: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (!form.fullName || !form.idNumber || !form.undergraduateYears || 
        !form.email || !form.password || !form.confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน")
      setLoading(false)
      return
    }

    if (form.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      setLoading(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      setLoading(false)
      return
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      // Store user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: form.fullName,
        idNumber: form.idNumber,
        undergraduateYears: form.undergraduateYears,
        email: form.email,
        role: "user",
        createdAt: new Date().toISOString()
      })

      setShowSuccessModal(true)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      let errorMessage = "เกิดข้อผิดพลาดในการลงทะเบียน"
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "อีเมลนี้ถูกใช้ไปแล้ว"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "รหัสผ่านไม่ปลอดภัย"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginFromModal = () => {
    setShowSuccessModal(false)
    navigate('/login')
  }

  return (
    <div
      className="
        min-h-screen
        bg-white
        bg-[radial-gradient(#dbeafe_1px,transparent_1px)]
        bg-[length:18px_18px]
      "
    >
      {/* ===== HEADER ===== */}
      <Header title="ลงทะเบียน" />

      {/* ===== CONTENT ===== */}
      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center">
          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form
            onSubmit={handleRegister}
            className="w-full flex flex-col items-center gap-4"
          >
            <input
              name="fullName"
              placeholder="ชื่อ-สกุล"
              value={form.fullName}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <input
              name="idNumber"
              placeholder="รหัสนักศึกษา"
              value={form.idNumber}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <input
              name="undergraduateYears"
              placeholder="ชั้นปี"
              value={form.undergraduateYears}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <input
              type="email"
              name="email"
              placeholder="Email มอ"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className="
                w-full h-11
                px-5
                rounded-full
                border border-gray-400
                outline-none
                text-sm
                disabled:bg-gray-100
              "
            />

            <button
              type="submit"
              disabled={loading}
              className="
                mt-4
                w-full h-12
                rounded-full
                bg-[#FF7F50]
                text-white text-lg font-medium
                hover:bg-[#ff6a33]
                disabled:bg-gray-400
                transition
              "
            >
              {loading ? "กำลังลงทะเบียน..." : "Register"}
            </button>
          </form>

          <button
            onClick={() => navigate('/login')}
            disabled={loading}
            className="
              mt-6
              px-8 py-2
              rounded-full
              border border-gray-400
              text-sm text-gray-600
              hover:bg-gray-100
              disabled:opacity-50
              transition
            "
          >
            Back to Login
          </button>
        </div>
      </div>

      {/* ===== SUCCESS MODAL ===== */}
      {showSuccessModal && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[320px] mx-4 flex flex-col items-center overflow-hidden">
            {/* Modal Header */}
            <div className="w-full bg-[#FF7F50] text-white py-6 px-4 text-center">
              <h2 className="text-lg font-semibold">ลงทะเบียนสำเร็จ!</h2>
            </div>

            {/* Modal Content */}
            <div className="w-full px-6 py-8 text-center">
              <p className="text-gray-700 text-sm mb-6">
                เข้าสู่ระบบด้วย Email และ Password ของคุณ
              </p>

              {/* Login Button */}
              <button
                onClick={handleLoginFromModal}
                className="
                  w-full
                  py-3
                  rounded-full
                  bg-[#FF7F50]
                  text-white
                  text-base font-semibold
                  hover:bg-[#ff6a33]
                  transition
                "
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
