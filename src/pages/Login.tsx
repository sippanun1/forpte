import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase/firebase"
import type { LoginForm } from "../types/auth"
import Header from "../components/Header"

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (!form.username || !form.password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน")
      setLoading(false)
      return
    }

    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, form.username, form.password)
      const user = userCredential.user

      // Check user role
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      const role = userData?.role || 'user'

      console.log("User logged in successfully with role:", role)
      
      // Redirect based on role
      if (role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/home')
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
      
      if (error.code === "auth/invalid-credential") {
        errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "ไม่พบผู้ใช้นี้"
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "รหัสผ่านไม่ถูกต้อง"
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในภายหลัง"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
      <Header title="PTE สวัสดีค่ะ" />

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
            onSubmit={handleLogin}
            className="w-full flex flex-col items-center gap-4"
            >
            <input
                name="username"
                placeholder="Email"
                type="email"
                value={form.username}
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
                {loading ? "กำลังเข้าสู่ระบบ..." : "Login"}
            </button>
            </form>

            <button
            onClick={() => navigate('/register')}
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
            Register
            </button>
        </div>
        </div>
    </div>
  )
}
