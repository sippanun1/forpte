import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, query, where } from "firebase/firestore"
import { db } from "../../firebase/firebase"
import Header from "../../components/Header"
import { useAuth } from "../../hooks/useAuth"
import { logAdminAction } from "../../utils/adminLogger"
import { loadAllEquipment, addNewAsset, addAssetStock, addNewConsumable, addConsumableStock, deleteEquipment, updateEquipmentMetadata } from "../../utils/equipmentHelper"

// Low stock threshold for consumables (in units)
const LOW_STOCK_THRESHOLD = 10

// Default equipment types with subtypes
const defaultEquipmentTypes: { [key: string]: string[] } = {
  "งานวัดและตรวจสอบ": [],
  "งานถอด-ประกอบชิ้นส่วน": [],
  "งานติดตั้งอุปกรณ์": [],
  "งานทำเครื่องหมายและขีดเส้น": [],
  "งานช่างมือพื้นฐาน": [],
  "Welding": ["SMAW", "GMAW", "GTAW", "GAS", "FCAW"],
  "Machine": ["Milling", "Lathe", "เครื่องไส", "เครื่องตัด", "เครื่องเจาะ"],
  "Safety": [],
}

interface Equipment {
  id: string
  name: string
  category: "consumable" | "asset" | "main"
  quantity: number
  unit: string
  picture?: string
  serialCode?: string
  equipmentTypes: string[]
  equipmentSubTypes: string[]
  available?: boolean
  serialCodes?: { id: string; code: string }[]
  allIds?: string[]
  sourceCollection?: 'equipmentMaster' | 'equipment'
  masterInstancePair?: {
    masterId: string
    instanceIds: string[]
  }
}

interface AddStockForm {
  equipmentId: string
  equipmentName: string
  equipmentCategory: "consumable" | "asset" | "main"
  quantity: string
  date: string
  referenceNumber: string
  assetIds: string[]
  notes: string
}

interface AddEquipmentForm {
  category: "consumable" | "asset" | "main"
  ids: string[]
  nameThai: string
  nameEnglish: string
  quantity: string
  unit: string
  notes: string
  picture?: string
  equipmentTypes: string[]
  equipmentSubTypes: string[]
}

interface EditEquipmentForm {
  id: string
  nameThai: string
  nameEnglish: string
  quantity: string
  unit: string
  picture?: string
  equipmentTypes: string[]
  equipmentSubTypes: string[]
}

export default function AdminManageEquipment() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | "consumable" | "asset" | "main">("all")
  const [selectedStockStatus, setSelectedStockStatus] = useState<"all" | "outOfStock" | "lowStock">("all")
  const [showStockStatusFilter, setShowStockStatusFilter] = useState(false)
  const [showAddStockModal, setShowAddStockModal] = useState(false)
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false)
  const [showAddStockConfirmModal, setShowAddStockConfirmModal] = useState(false)
  const [showAssetEditModal, setShowAssetEditModal] = useState(false)
  const [assetIdsForItem, setAssetIdsForItem] = useState<string[]>([])
  const [assetCodesForItem, setAssetCodesForItem] = useState<{ docId: string; serialCode: string; sourceCollection: 'assetInstances' | 'equipment' }[]>([])
  const [selectedAssetIdToDelete, setSelectedAssetIdToDelete] = useState("")
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("")
  const [assetEditNameThai, setAssetEditNameThai] = useState("")
  const [assetEditNameEnglish, setAssetEditNameEnglish] = useState("")
  const [assetEditCodesMarkedForDelete, setAssetEditCodesMarkedForDelete] = useState<string[]>([])
  const [assetEditPicture, setAssetEditPicture] = useState<string | undefined>(undefined)
  const [assetEditTypes, setAssetEditTypes] = useState<string[]>([])
  const [assetEditSubTypes, setAssetEditSubTypes] = useState<string[]>([])
  // Original values for logging (before edit)
  const [originalAssetTypes, setOriginalAssetTypes] = useState<string[]>([])
  const [originalAssetSubTypes, setOriginalAssetSubTypes] = useState<string[]>([])
  const [originalEditTypes, setOriginalEditTypes] = useState<string[]>([])
  const [originalEditSubTypes, setOriginalEditSubTypes] = useState<string[]>([])
  const [originalEditQuantity, setOriginalEditQuantity] = useState<string>("")
  const [showAssetCodeDeleteConfirm, setShowAssetCodeDeleteConfirm] = useState(false)
  const [assetCodeToDelete, setAssetCodeToDelete] = useState("")
  const [showAssetDeleteAllConfirm, setShowAssetDeleteAllConfirm] = useState(false)
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null)
  const [editingCodeValue, setEditingCodeValue] = useState("")
  const [assetCodeSearchTerm, setAssetCodeSearchTerm] = useState("")
  const [editForm, setEditForm] = useState<EditEquipmentForm>({
    id: "",
    nameThai: "",
    nameEnglish: "",
    quantity: "",
    unit: "ชิ้น",
    picture: undefined,
    equipmentTypes: [],
    equipmentSubTypes: []
  })
  const [addStockForm, setAddStockForm] = useState<AddStockForm>({
    equipmentId: "",
    equipmentName: "",
    equipmentCategory: "consumable",
    quantity: "",
    date: new Date().toISOString().split('T')[0],
    referenceNumber: "",
    assetIds: [],
    notes: ""
  })
  const [addEquipmentForm, setAddEquipmentForm] = useState<AddEquipmentForm>({
    category: "consumable",
    ids: [],
    nameThai: "",
    nameEnglish: "",
    quantity: "",
    unit: "ชิ้น",
    notes: "",
    picture: undefined,
    equipmentTypes: [],
    equipmentSubTypes: []
  })
  // Loading states for double-click prevention
  const [isSubmittingEquipment, setIsSubmittingEquipment] = useState(false)
  const [isSubmittingStock, setIsSubmittingStock] = useState(false)
  // Custom equipment types (loaded from Firebase)
  const [equipmentTypes, setEquipmentTypes] = useState<{ [key: string]: string[] }>(defaultEquipmentTypes)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [showManageTypesModal, setShowManageTypesModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeSubTypes, setNewTypeSubTypes] = useState<string[]>([])
  const [newSubTypeInput, setNewSubTypeInput] = useState("")
  const [selectedTypeToDelete, setSelectedTypeToDelete] = useState<string>("")
  const [selectedSubTypeToDelete, setSelectedSubTypeToDelete] = useState<string>("")
  const [showDeleteTypeConfirm, setShowDeleteTypeConfirm] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)

  // Load equipment from Firestore
  const loadEquipment = async (skipCache = false) => {
    try {
      const equipmentList = await loadAllEquipment(!skipCache)
      setEquipment(equipmentList as Equipment[])
      return equipmentList
    } catch (error) {
      console.error("Error loading equipment:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Load custom equipment types from Firestore
  useEffect(() => {
    const loadEquipmentTypes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "equipmentTypes"))
        const customTypes: { [key: string]: string[] } = { ...defaultEquipmentTypes }
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          customTypes[data.name] = data.subTypes || []
        })
        setEquipmentTypes(customTypes)
      } catch (error) {
        console.error("Error loading equipment types:", error)
      }
    }
    loadEquipmentTypes()
  }, [])

  // Load equipment from Firestore on mount
  useEffect(() => {
    loadEquipment()
  }, [])

  const categories = [
    { key: "all", label: "ทั้งหมด" },
    { key: "consumable", label: "วัสดุสิ้นเปลือง" },
    { key: "asset", label: "ครุภัณฑ์" },
  ] as const

  const stockStatuses = [
    { key: "all", label: "สต๊อกทั้งหมด" },
    { key: "outOfStock", label: "หมดสต๊อก" },
    { key: "lowStock", label: "สต๊อกไม่เพียงพอ" },
  ] as const

  // Group equipment by name for assets, keep consumables separate
  const getGroupedEquipment = () => {
    const grouped: { [key: string]: Equipment[] } = {}
    
    equipment.forEach((item) => {
      if (!grouped[item.name]) {
        grouped[item.name] = []
      }
      grouped[item.name].push(item)
    })
    
    return Object.entries(grouped).map(([_name, items]) => {
      if (items[0].category === "asset") {
        // For assets, show as one item with total quantity
        return {
          ...items[0],
          quantity: items.length,
          allIds: items.map(i => i.id)
        }
      }
      // For consumables, return each separately
      return items.length === 1 ? { ...items[0], allIds: [items[0].id] } : { ...items[0], allIds: items.map(i => i.id) }
    }).flat()
  }

  const groupedEquipment = getGroupedEquipment()

  const filteredEquipment = groupedEquipment.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    
    // Filter by stock status (only for consumables)
    let matchesStockStatus = true
    if (selectedStockStatus !== "all") {
      if (selectedStockStatus === "outOfStock") {
        matchesStockStatus = item.quantity === 0
      } else if (selectedStockStatus === "lowStock") {
        matchesStockStatus = item.quantity > 0 && item.quantity < LOW_STOCK_THRESHOLD
      }
    }
    
    return matchesSearch && matchesCategory && matchesStockStatus
  })

  const handleAddEquipment = () => {
    setAddEquipmentForm({
      category: "consumable",
      ids: [],
      nameThai: "",
      nameEnglish: "",
      quantity: "",
      unit: "ชิ้น",
      notes: "",
      picture: undefined,
      equipmentTypes: [],
      equipmentSubTypes: []
    })
    setShowAddEquipmentModal(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        setAddEquipmentForm({ ...addEquipmentForm, picture: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddEquipmentSubmit = async () => {
    // Prevent double submission
    if (isSubmittingEquipment) return
    
    const isAsset = addEquipmentForm.category === "asset"
    const quantityNum = parseInt(addEquipmentForm.quantity) || 0
    
    // For assets, check if all IDs are filled
    if (isAsset && addEquipmentForm.ids.length !== quantityNum) {
      alert("กรุณากรอกรหัสอุปกรณ์ทั้งหมด")
      return
    }
    
    // Check for empty IDs
    if (isAsset && addEquipmentForm.ids.some(id => !id.trim())) {
      alert("รหัสอุปกรณ์ต้องไม่เป็นค่าว่าง")
      return
    }
    
    // Check for duplicate IDs
    if (isAsset && new Set(addEquipmentForm.ids).size !== addEquipmentForm.ids.length) {
      alert("รหัสอุปกรณ์ต้องไม่ซ้ำกัน")
      return
    }
    
    if (addEquipmentForm.nameThai && addEquipmentForm.quantity) {
      setIsSubmittingEquipment(true)
      try {
        let equipmentId: string | null = null

        if (isAsset) {
          // Use new two-collection approach
          equipmentId = await addNewAsset(
            addEquipmentForm.nameThai,
            addEquipmentForm.nameEnglish,
            addEquipmentForm.ids,
            addEquipmentForm.unit,
            addEquipmentForm.equipmentTypes,
            addEquipmentForm.equipmentSubTypes,
            addEquipmentForm.picture
          )
        } else {
          // Use new consumable helper
          equipmentId = await addNewConsumable(
            addEquipmentForm.nameThai,
            addEquipmentForm.nameEnglish,
            parseInt(addEquipmentForm.quantity),
            addEquipmentForm.unit,
            addEquipmentForm.equipmentTypes,
            addEquipmentForm.equipmentSubTypes,
            addEquipmentForm.picture
          )
        }

        if (!equipmentId) {
          alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
          return
        }
        
        // Log admin action
        if (user) {
          logAdminAction({
            user,
            action: 'add',
            type: 'equipment',
            itemName: addEquipmentForm.nameThai,
            details: `Category: ${addEquipmentForm.category === 'consumable' ? 'วัสดุสิ้นเปลือง' : 'ครุภัณฑ์'}, Type: ${addEquipmentForm.equipmentTypes?.join(', ') || 'N/A'}${addEquipmentForm.equipmentSubTypes?.length ? ` (${addEquipmentForm.equipmentSubTypes.join(', ')})` : ''}, Quantity: ${addEquipmentForm.quantity}`
          })
        }

        // Refresh the equipment list immediately (skip cache to get fresh data)
        await loadEquipment(true)
        
        setShowAddEquipmentModal(false)
        setSuccessMessage("เพิ่มอุปกรณ์ใหม่สำเร็จ!")
        setShowSuccessModal(true)
      } catch (error) {
        console.error("Error adding equipment:", error)
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
      } finally {
        setIsSubmittingEquipment(false)
      }
    }
  }

  const handleIssue = async (equipmentName: string, itemAllIds: any) => {
    const isAsset = equipment.find(e => e.name === equipmentName)?.category === "asset"
    
    // If asset with multiple IDs, show asset edit modal
    if (isAsset && itemAllIds.length > 1) {
      setAssetIdsForItem(itemAllIds)
      setSelectedEquipmentId(equipmentName)
      
      // Fetch full equipment data to get serialCodes from assetInstances (new structure)
      try {
        // Check both assetInstances (new) and equipment (old) collections
        const [assetInstancesSnap, equipmentSnap] = await Promise.all([
          getDocs(collection(db, "assetInstances")),
          getDocs(collection(db, "equipment"))
        ])
        
        const codes: { docId: string; serialCode: string; sourceCollection: 'assetInstances' | 'equipment' }[] = []
        
        // Check assetInstances first (new structure)
        assetInstancesSnap.forEach((docSnap) => {
          if (itemAllIds.includes(docSnap.id)) {
            codes.push({
              docId: docSnap.id,
              serialCode: docSnap.data().serialCode || docSnap.id,
              sourceCollection: 'assetInstances'
            })
          }
        })
        
        // Fallback to equipment collection if needed (backward compatibility)
        if (codes.length === 0) {
          equipmentSnap.forEach((docSnap) => {
            if (itemAllIds.includes(docSnap.id)) {
              codes.push({
                docId: docSnap.id,
                serialCode: docSnap.data().serialCode || docSnap.id,
                sourceCollection: 'equipment'
              })
            }
          })
        }
        
        setAssetCodesForItem(codes)
      } catch (error) {
        console.error("Error fetching asset codes:", error)
      }
      
      // Extract Thai and English names
      const nameParts = equipmentName.split(" (")
      const nameThai = nameParts[0]
      const nameEnglish = nameParts[1] ? nameParts[1].replace(")", "") : ""
      
      // Get picture and type from first item with this name
      const firstItem = equipment.find(e => e.name === equipmentName)
      setAssetEditPicture(firstItem?.picture)
      setAssetEditTypes(firstItem?.equipmentTypes || [])
      setAssetEditSubTypes(firstItem?.equipmentSubTypes || [])
      // Store original values for logging
      setOriginalAssetTypes(firstItem?.equipmentTypes || [])
      setOriginalAssetSubTypes(firstItem?.equipmentSubTypes || [])
      
      setAssetEditNameThai(nameThai)
      setAssetEditNameEnglish(nameEnglish)
      setAssetEditCodesMarkedForDelete([])
      setShowAssetEditModal(true)
      return
    }
    
    // For single item or consumable, proceed normally
    const item = equipment.find(e => e.name === equipmentName)
    if (item) {
      const nameParts = item.name.split(" (")
      const nameThai = nameParts[0]
      const nameEnglish = nameParts[1] ? nameParts[1].replace(")", "") : ""

      setSelectedEquipmentId(item.id)
      setEditForm({
        id: item.id,
        nameThai: nameThai,
        nameEnglish: nameEnglish,
        quantity: item.quantity.toString(),
        unit: item.unit || "ชิ้น",
        picture: item.picture,
        equipmentTypes: item.equipmentTypes || [],
        equipmentSubTypes: item.equipmentSubTypes || []
      })
      // Store original values for logging
      setOriginalEditTypes(item.equipmentTypes || [])
      setOriginalEditSubTypes(item.equipmentSubTypes || [])
      setOriginalEditQuantity(item.quantity.toString())
      setShowEditModal(true)
    }
  }

  const handleEditSubmit = () => {
    setShowEditModal(false)
    setShowEditConfirmModal(true)
  }

  const handleEditConfirm = async () => {
    const fullName = editForm.nameEnglish ? `${editForm.nameThai} (${editForm.nameEnglish})` : editForm.nameThai
    
    try {
      const itemToUpdate = equipment.find(e => e.id === editForm.id)
      if (!itemToUpdate) {
        throw new Error("Equipment not found")
      }

      // Use new updateEquipmentMetadata helper that handles both collections
      const success = await updateEquipmentMetadata(itemToUpdate, {
        name: fullName,
        quantity: parseInt(editForm.quantity) || 0,
        unit: editForm.unit,
        picture: editForm.picture,
        equipmentTypes: editForm.equipmentTypes,
        equipmentSubTypes: editForm.equipmentSubTypes
      })

      if (!success) {
        throw new Error("Failed to update equipment")
      }
      
      setEquipment(equipment.map(item =>
        item.id === editForm.id
          ? { ...item, name: fullName, quantity: parseInt(editForm.quantity) || 0, unit: editForm.unit, picture: editForm.picture, equipmentTypes: editForm.equipmentTypes, equipmentSubTypes: editForm.equipmentSubTypes }
          : item
      ))
      
      // Log admin action
      if (user) {
        const changes: string[] = []
        
        // Check quantity change
        if (editForm.quantity !== originalEditQuantity) {
          changes.push(`จำนวน: ${originalEditQuantity} → ${editForm.quantity}`)
        }
        
        // Check type change
        const oldType = originalEditTypes?.length ? originalEditTypes.join(', ') : 'ไม่ระบุ'
        const newType = editForm.equipmentTypes?.length ? editForm.equipmentTypes.join(', ') : 'ไม่ระบุ'
        if (JSON.stringify(originalEditTypes) !== JSON.stringify(editForm.equipmentTypes) || JSON.stringify(originalEditSubTypes) !== JSON.stringify(editForm.equipmentSubTypes)) {
          changes.push(`ประเภท: ${oldType} → ${newType}`)
        }
        
        logAdminAction({
          user,
          action: 'edit',
          type: 'equipment',
          itemName: editForm.nameThai,
          details: changes.length > 0 ? changes.join(', ') : 'ไม่มีการเปลี่ยนแปลง'
        })
      }
      
      setShowEditConfirmModal(false)
      setSuccessMessage("แก้ไขอุปกรณ์สำเร็จ!")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error updating equipment:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  const handleDeleteClick = () => {
    setShowEditModal(false)
    setShowDeleteConfirmModal(true)
  }

  // Handle adding new equipment type
  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      alert("กรุณากรอกชื่อประเภท")
      return
    }
    
    // Check if type already exists
    if (equipmentTypes[newTypeName]) {
      alert("ประเภทนี้มีอยู่แล้ว")
      return
    }
    
    try {
      // Save to Firebase
      await addDoc(collection(db, "equipmentTypes"), {
        name: newTypeName,
        subTypes: newTypeSubTypes
      })
      
      // Update local state
      setEquipmentTypes({
        ...equipmentTypes,
        [newTypeName]: newTypeSubTypes
      })
      
      // Log admin action
      if (user) {
        logAdminAction({
          user,
          action: 'add',
          type: 'equipment',
          itemName: newTypeName,
          details: `Added new equipment type${newTypeSubTypes.length > 0 ? ` with subtypes: ${newTypeSubTypes.join(', ')}` : ''}`
        })
      }
      
      setShowAddTypeModal(false)
      setNewTypeName("")
      setNewTypeSubTypes([])
      setNewSubTypeInput("")
      setSuccessMessage("เพิ่มประเภทอุปกรณ์ใหม่สำเร็จ!")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error adding equipment type:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  const handleDeleteType = (typeName: string) => {
    setSelectedTypeToDelete(typeName)
    setSelectedSubTypeToDelete("")
    setShowDeleteTypeConfirm(true)
  }

  const handleDeleteSubType = (typeName: string, subTypeName: string) => {
    setSelectedTypeToDelete(typeName)
    setSelectedSubTypeToDelete(subTypeName)
    setShowDeleteTypeConfirm(true)
  }

  const handleDeleteTypeConfirm = async () => {
    try {
      if (selectedSubTypeToDelete) {
        // Delete subtype from an existing type
        const querySnapshot = await getDocs(collection(db, "equipmentTypes"))
        for (const docSnap of querySnapshot.docs) {
          if (docSnap.data().name === selectedTypeToDelete) {
            const updatedSubTypes = docSnap.data().subTypes.filter((st: string) => st !== selectedSubTypeToDelete)
            await updateDoc(doc(db, "equipmentTypes", docSnap.id), {
              subTypes: updatedSubTypes
            })
            break
          }
        }
        
        // Update local state
        const updatedTypes = { ...equipmentTypes }
        if (updatedTypes[selectedTypeToDelete]) {
          updatedTypes[selectedTypeToDelete] = updatedTypes[selectedTypeToDelete].filter(
            (st) => st !== selectedSubTypeToDelete
          )
          setEquipmentTypes(updatedTypes)
        }
        
        setSuccessMessage(`ลบประเภทย่อย '${selectedSubTypeToDelete}' สำเร็จ!`)
      } else {
        // Delete entire type from Firestore
        const querySnapshot = await getDocs(collection(db, "equipmentTypes"))
        for (const docSnap of querySnapshot.docs) {
          if (docSnap.data().name === selectedTypeToDelete) {
            await deleteDoc(doc(db, "equipmentTypes", docSnap.id))
            break
          }
        }
        
        // Remove from local state
        const updatedTypes = { ...equipmentTypes }
        delete updatedTypes[selectedTypeToDelete]
        setEquipmentTypes(updatedTypes)
        
        setSuccessMessage(`ลบประเภท '${selectedTypeToDelete}' สำเร็จ!`)
      }

      // Log admin action
      if (user) {
        logAdminAction({
          user,
          action: 'delete',
          type: 'equipment',
          itemName: selectedTypeToDelete,
          details: selectedSubTypeToDelete ? `ลบประเภทย่อย: ${selectedSubTypeToDelete}` : `ลบประเภทอุปกรณ์`
        })
      }

      setShowDeleteTypeConfirm(false)
      setSelectedTypeToDelete("")
      setSelectedSubTypeToDelete("")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error deleting type:", error)
      alert(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูล'}`)
    }
  }

  const handleAssetEditCodeDelete = (docId: string) => {
    setAssetCodeToDelete(docId)
    setShowAssetCodeDeleteConfirm(true)
  }

  const handleAssetCodeDeleteConfirm = async () => {
    try {
      // Delete from the correct collection based on sourceCollection
      const deletedCode = assetCodesForItem.find(c => c.docId === assetCodeToDelete)
      const deletedSerialCode = deletedCode?.serialCode || assetCodeToDelete
      const sourceCollection = deletedCode?.sourceCollection || 'equipment'
      
      // Delete from Firestore using document ID and correct collection
      await deleteDoc(doc(db, sourceCollection, assetCodeToDelete))
      
      // Update assetCodesForItem
      const updatedCodes = assetCodesForItem.filter(c => c.docId !== assetCodeToDelete)
      setAssetCodesForItem(updatedCodes)
      
      // Update assetIdsForItem
      const updatedIds = assetIdsForItem.filter(id => id !== assetCodeToDelete)
      setAssetIdsForItem(updatedIds)

      // Log admin action
      if (user) {
        logAdminAction({
          user,
          action: 'delete',
          type: 'equipment',
          itemName: assetEditNameThai,
          details: `ลบรหัสครุภัณฑ์: ${deletedSerialCode}`
        })
      }

      setShowAssetCodeDeleteConfirm(false)
      setAssetCodeToDelete("")
      
      // If no more codes left, close the modal
      if (updatedIds.length === 0) {
        setShowAssetEditModal(false)
        setAssetEditPicture(undefined)
        setAssetCodeSearchTerm("")
        setSuccessMessage("ลบรหัสอุปกรณ์สำเร็จ!")
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      alert("เกิดข้อผิดพลาดในการลบข้อมูล")
    }
  }

  const handleAssetDeleteAll = () => {
    setShowAssetDeleteAllConfirm(true)
  }

  const handleAssetDeleteAllConfirm = async () => {
    try {
      // Delete all from Firestore using correct collections
      const batch = writeBatch(db)
      for (const codeItem of assetCodesForItem) {
        // Delete from the correct collection based on sourceCollection
        batch.delete(doc(db, codeItem.sourceCollection, codeItem.docId))
      }
      await batch.commit()
      
      // Clear asset codes
      setAssetCodesForItem([])
      setAssetIdsForItem([])

      // Log admin action
      if (user) {
        const codes = assetCodesForItem.map(c => c.serialCode).join(", ")
        logAdminAction({
          user,
          action: 'delete',
          type: 'equipment',
          itemName: assetEditNameThai,
          details: `ลบครุภัณฑ์ทั้งหมด ${assetCodesForItem.length} รายการ (รหัส: ${codes})`
        })
      }

      setShowAssetDeleteAllConfirm(false)
      setShowAssetEditModal(false)
      setAssetEditCodesMarkedForDelete([])
      setAssetCodeSearchTerm("")
      setEditingCodeId(null)
      setEditingCodeValue("")
      setAssetEditPicture(undefined)
      setSuccessMessage(`ลบครุภัณฑ์ ${assetEditNameThai} สำเร็จ!`)
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error deleting all equipment:", error)
      alert("เกิดข้อผิดพลาดในการลบข้อมูล")
    }
  }

  const handleAssetEditConfirm = async () => {
    // Build new name
    const newFullName = assetEditNameEnglish 
      ? `${assetEditNameThai} (${assetEditNameEnglish})` 
      : assetEditNameThai
    
    try {
      // Update in Firestore - need to update master for asset names, instances for metadata
      // For simplicity, we'll update the equipment master by name
      const masterQuery = query(collection(db, 'equipmentMaster'), where('name', '==', selectedEquipmentId))
      const masterSnapshot = await getDocs(masterQuery)
      
      // If master exists, update it (new structure)
      if (!masterSnapshot.empty) {
        const batch = writeBatch(db)
        for (const docSnap of masterSnapshot.docs) {
          batch.update(doc(db, 'equipmentMaster', docSnap.id), {
            picture: assetEditPicture,
            equipmentTypes: assetEditTypes,
            equipmentSubTypes: assetEditSubTypes
          })
        }
        await batch.commit()
      } else {
        // Fallback: update from equipment collection (old structure)
        const equipmentSnapshot = await getDocs(collection(db, "equipment"))
        const batch = writeBatch(db)
        for (const docSnap of equipmentSnapshot.docs) {
          if (docSnap.data().name === selectedEquipmentId) {
            batch.update(doc(db, "equipment", docSnap.id), {
              name: newFullName,
              picture: assetEditPicture,
              equipmentTypes: assetEditTypes,
              equipmentSubTypes: assetEditSubTypes
            })
          }
        }
        await batch.commit()
      }
      
      // Update name, picture, type and subtype for all assets with same name
      const updatedEquipment = equipment.map(item => {
        if (item.name === selectedEquipmentId) {
          return { ...item, name: newFullName, picture: assetEditPicture, equipmentTypes: assetEditTypes, equipmentSubTypes: assetEditSubTypes }
        }
        return item
      })
      
      setEquipment(updatedEquipment)

      // Log admin action
      if (user) {
        const changes: string[] = []
        if (newFullName !== selectedEquipmentId) {
          changes.push(`ชื่อ: "${selectedEquipmentId}" → "${newFullName}"`)
        }
        
        // Check type change
        const oldType = originalAssetTypes?.length ? originalAssetTypes.join(', ') : 'ไม่ระบุ'
        const newType = assetEditTypes?.length ? assetEditTypes.join(', ') : 'ไม่ระบุ'
        if (JSON.stringify(originalAssetTypes) !== JSON.stringify(assetEditTypes) || JSON.stringify(originalAssetSubTypes) !== JSON.stringify(assetEditSubTypes)) {
          changes.push(`ประเภท: ${oldType} → ${newType}`)
        }
        
        logAdminAction({
          user,
          action: 'edit',
          type: 'equipment',
          itemName: assetEditNameThai,
          details: changes.length > 0 ? changes.join(', ') : `อัปเดตครุภัณฑ์ (${assetIdsForItem.length} รายการ)`
        })
      }

      setShowAssetEditModal(false)
      setAssetEditCodesMarkedForDelete([])
      setAssetCodeSearchTerm("")
      setEditingCodeId(null)
      setEditingCodeValue("")
      setAssetEditPicture(undefined)
      setAssetEditTypes([])
      setAssetEditSubTypes([])
      setSuccessMessage("บันทึกการเปลี่ยนแปลงสำเร็จ!")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error updating equipment:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  const handleAssetEditCancel = () => {
    setShowAssetEditModal(false)
    setAssetEditCodesMarkedForDelete([])
    setAssetCodeSearchTerm("")
    setEditingCodeId(null)
    setEditingCodeValue("")
    setAssetEditPicture(undefined)
    setAssetEditTypes([])
    setAssetEditSubTypes([])
  }

  const handleAddStockSubmitClick = () => {
    setShowAddStockModal(false)
    setShowAddStockConfirmModal(true)
  }

  const handleDeleteConfirm = async () => {
    const itemToDelete = equipment.find(item => item.id === selectedAssetIdToDelete || item.id === selectedEquipmentId)
    
    try {
      if (!itemToDelete) {
        throw new Error("Equipment not found")
      }

      // Use new deleteEquipment helper that handles both collections
      const success = await deleteEquipment(itemToDelete)
      
      if (!success) {
        throw new Error("Failed to delete equipment")
      }
      
      setEquipment(equipment.filter(item => item.id !== (selectedAssetIdToDelete || selectedEquipmentId)))
      
      // Log admin action
      if (user && itemToDelete) {
        logAdminAction({
          user,
          action: 'delete',
          type: 'equipment',
          itemName: itemToDelete.name,
          details: `Category: ${itemToDelete.category === 'consumable' ? 'วัสดุสิ้นเปลือง' : 'ครุภัณฑ์'}, Quantity was: ${itemToDelete.quantity}`
        })
      }
      
      setShowDeleteConfirmModal(false)
      setSelectedAssetIdToDelete("")
      setSuccessMessage("ลบอุปกรณ์สำเร็จ!")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error deleting equipment:", error)
      alert("เกิดข้อผิดพลาดในการลบข้อมูล")
    }
  }

  const handleAdd = (equipmentId: string) => {
    const item = equipment.find(e => e.id === equipmentId)
    if (item) {
      setAddStockForm({
        equipmentId: item.id,
        equipmentName: item.name,
        equipmentCategory: item.category,
        quantity: "",
        date: new Date().toISOString().split('T')[0],
        referenceNumber: "",
        assetIds: [],
        notes: ""
      })
      setShowAddStockModal(true)
    }
  }

  const handleAddStockSubmit = () => {
    const isAsset = addStockForm.equipmentCategory === "asset"
    
    if (isAsset) {
      // For assets, check if all IDs are filled
      const quantityNum = parseInt(addStockForm.quantity) || 0
      if (addStockForm.assetIds.length !== quantityNum) {
        alert("กรุณากรอกรหัสอุปกรณ์ทั้งหมด")
        return
      }
      
      // Check for empty IDs
      if (addStockForm.assetIds.some(id => !id.trim())) {
        alert("รหัสอุปกรณ์ต้องไม่เป็นค่าว่าง")
        return
      }
      
      // Check for duplicate IDs
      if (new Set(addStockForm.assetIds).size !== addStockForm.assetIds.length) {
        alert("รหัสอุปกรณ์ต้องไม่ซ้ำกัน")
        return
      }
    } else {
      // For consumables, check required fields
      if (!addStockForm.quantity || !addStockForm.date) {
        alert("กรุณากรอกจำนวนและวันที่รับเข้า")
        return
      }
    }
    
    handleAddStockSubmitClick()
  }

  const handleAddStockConfirm = async () => {
    // Prevent double submission
    if (isSubmittingStock) return
    
    const isAsset = addStockForm.equipmentCategory === "asset"
    
    setIsSubmittingStock(true)
    try {
      let success = false

      if (isAsset) {
        // Use new asset stock helper
        success = await addAssetStock(addStockForm.equipmentName, addStockForm.assetIds)
      } else {
        // Use new consumable stock helper
        success = await addConsumableStock(addStockForm.equipmentId, parseInt(addStockForm.quantity))
      }

      if (!success) {
        throw new Error("Failed to add stock")
      }
      
      // Log admin action for adding stock
      if (user) {
        const isAssetCategory = addStockForm.equipmentCategory === "asset"
        const existingUnit = equipment.find(e => e.name === addStockForm.equipmentName)?.unit || "ชิ้น"
        logAdminAction({
          user,
          action: 'update',
          type: 'equipment',
          itemName: addStockForm.equipmentName,
          details: isAssetCategory 
            ? `เพิ่มสต๊อกครุภัณฑ์: ${addStockForm.assetIds.length} รายการ (รหัส: ${addStockForm.assetIds.join(', ')})`
            : `เพิ่มสต๊อก: +${addStockForm.quantity} ${existingUnit}`
        })
      }

      // Refresh the equipment list immediately (skip cache to get fresh data)
      await loadEquipment(true)
      
      setShowAddStockConfirmModal(false)
      setSuccessMessage("เพิ่มสต๊อกสำเร็จ!")
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error adding stock:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    } finally {
      setIsSubmittingStock(false)
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
      <Header title="จัดการอุปกรณ์/ครุภัณฑ์" />

      {/* ===== CONTENT ===== */}
      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-[360px] px-4 flex flex-col items-center pb-6">
          {/* Back Button and Add Equipment Button */}
          <div className="w-full flex gap-3 mt-6 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="
                flex-1
                py-3
                rounded-full
                border border-gray-400
                text-gray-600
                text-sm font-medium
                hover:bg-gray-100
                transition
                flex items-center justify-center gap-2
              "
            >
            <img src="/arrow.svg" alt="back" className="w-5 h-5" />
            </button>
            <button
              onClick={handleAddEquipment}
              className="
                flex-1
                py-3
                rounded-full
                bg-orange-500
                text-white
                text-sm font-semibold
                hover:bg-orange-600
                transition
              "
            >
              + เพิ่มอุปกรณ์ใหม่
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full mb-6 relative">
            <input
              type="text"
              placeholder="ค้นหา"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full
                h-10
                px-4
                border border-gray-300
                rounded-full
                outline-none
                text-sm
              "
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">
              🔍
            </button>
          </div>

          {/* Collapsible Filter Section */}
          <div className="w-full bg-gray-50 border border-gray-200 rounded-lg mb-6 overflow-hidden">
            {/* Filter Header - Always Visible */}
            <button
              onClick={() => setShowStockStatusFilter(!showStockStatusFilter)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🔧 ตัวกรอง</span>
                {(selectedCategory !== "all" || selectedStockStatus !== "all") && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    กำลังใช้งาน
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  พบ <span className="font-semibold text-blue-600">{filteredEquipment.length}</span> รายการ
                </span>
                <span className={`text-gray-400 transition-transform ${showStockStatusFilter ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>
            
            {/* Collapsible Filter Content */}
            {showStockStatusFilter && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {/* Category Filter */}
                <div className="mt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">หมวดหมู่:</p>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(cat.key as any)}
                        className={`
                          px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${
                            selectedCategory === cat.key
                              ? "bg-orange-500 text-white"
                              : "border border-gray-300 text-gray-700 hover:border-orange-500"
                          }
                        `}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Status Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">สต๊อก:</p>
                  <div className="flex gap-2 flex-wrap">
                    {stockStatuses.map((status) => (
                      <button
                        key={status.key}
                        onClick={() => setSelectedStockStatus(status.key as any)}
                        className={`
                          px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${
                            selectedStockStatus === status.key
                              ? status.key === "outOfStock" 
                                ? "bg-red-700 text-white"
                                : status.key === "lowStock"
                                ? "bg-red-500 text-white"
                                : "bg-orange-500 text-white"
                              : "border border-gray-300 text-gray-700 hover:border-orange-500"
                          }
                        `}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedCategory("all")
                      setSelectedStockStatus("all")
                    }}
                    className="text-xs text-gray-500 hover:text-red-500 transition flex items-center gap-1"
                  >
                    ✕ ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equipment List */}
          <div className="w-full flex flex-col gap-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredEquipment.length > 0 ? (
              filteredEquipment.map((item: any) => (
                <div
                  key={item.name}
                  className="
                    bg-orange-50
                    rounded-lg
                    p-4
                    border border-orange-200
                  "
                >
                  {/* Equipment Picture */}
                  {item.picture && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img
                        src={item.picture}
                        alt={item.name}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}

                  {/* Equipment Name */}
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    {item.name}
                  </h3>

                  {/* Quantity with Low Stock Indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-600">
                      จำนวนอุปกรณ์ {item.quantity} {item.unit || "ชิ้น"}
                    </p>
                    {item.category === "consumable" && (
                      <>
                        {item.quantity === 0 && (
                          <span className="ml-2 px-2 py-1 bg-red-700 text-white text-xs font-semibold rounded">
                            หมดสต๊อก
                          </span>
                        )}
                        {item.quantity > 0 && item.quantity < LOW_STOCK_THRESHOLD && (
                          <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                            สต๊อกใกล้หมด
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => await handleIssue(item.name, item.allIds)}
                      className="
                        flex-1
                        py-2
                        rounded
                        border border-orange-500
                        text-orange-500
                        text-xs font-medium
                        hover:bg-orange-50
                        transition
                      "
                    >
                      แก้ไข/ลบ
                    </button>
                    <button
                      onClick={() => handleAdd(item.id)}
                      className="
                        flex-1
                        py-2
                        rounded
                        bg-orange-500
                        text-white
                        text-xs font-medium
                        hover:bg-orange-600
                        transition
                      "
                    >
                      เพิ่มสต๊อก
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full text-center text-gray-500 py-8">
                ไม่พบอุปกรณ์ที่ค้นหา
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ADD STOCK MODAL ===== */}
      {showAddStockModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start z-50">
          <div className="w-screen h-screen bg-white overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              เพิ่มสต๊อก
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-5">
              {/* Equipment Name Display */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์</label>
                <input
                  type="text"
                  value={addStockForm.equipmentName}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm bg-gray-50 text-gray-600"
                />
              </div>

              {/* For Consumables - Date Field */}
              {addStockForm.equipmentCategory !== "asset" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">วันที่รับเข้า</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={addStockForm.date}
                      onChange={(e) => setAddStockForm({ ...addStockForm, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">📅</span>
                  </div>
                </div>
              )}

              {/* Quantity Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  {addStockForm.equipmentCategory === "asset" ? "จำนวนอุปกรณ์ที่เพิ่ม" : "จำนวนที่เพิ่ม"}
                </label>
                <input
                  type="number"
                  value={addStockForm.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0
                    if (addStockForm.equipmentCategory === "asset") {
                      // For assets, generate asset ID fields
                      const newIds = Array(qty).fill("").map((_, i) => addStockForm.assetIds[i] || "")
                      setAddStockForm({ ...addStockForm, quantity: e.target.value, assetIds: newIds })
                    } else {
                      setAddStockForm({ ...addStockForm, quantity: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder={addStockForm.equipmentCategory === "asset" ? "เช่น 5" : "เช่น 20"}
                  min="1"
                />
              </div>

              {/* Asset ID Fields - Only for Assets */}
              {addStockForm.equipmentCategory === "asset" && addStockForm.assetIds.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-3">รหัสอุปกรณ์</label>
                  <div className="flex flex-col gap-2">
                    {addStockForm.assetIds.map((id, index) => (
                      <input
                        key={index}
                        type="text"
                        value={id}
                        onChange={(e) => {
                          const newIds = [...addStockForm.assetIds]
                          newIds[index] = e.target.value
                          setAddStockForm({ ...addStockForm, assetIds: newIds })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                        placeholder={`รหัสอุปกรณ์ที่ ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Field - Only for Assets */}
              {addStockForm.equipmentCategory === "asset" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">หมายเหตุ</label>
                  <input
                    type="text"
                    value={addStockForm.notes}
                    onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                    placeholder="ไม่จำเป็นต้องกรอก"
                  />
                </div>
              )}

              {/* For Consumables - Reference Number Field */}
              {addStockForm.equipmentCategory !== "asset" && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">เลขที่ใบเบิก</label>
                  <input
                    type="text"
                    value={addStockForm.referenceNumber}
                    onChange={(e) => setAddStockForm({ ...addStockForm, referenceNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                    placeholder="ไม่จำเป็นต้องกรอก"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pb-4 justify-end">
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="px-6 py-3 border border-gray-400 text-gray-600 rounded-full font-medium hover:bg-gray-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddStockSubmit}
                  className="px-6 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUCCESS MODAL ===== */}
      {showSuccessModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full overflow-hidden">
            {/* Success Header */}
            <div className="w-full bg-orange-500 text-white p-4 text-center">
              <h2 className="text-lg font-bold">{successMessage}</h2>
            </div>

            {/* Modal Content */}
            <div className="p-8 text-center">

              {/* Show item name for asset edit/delete operations */}
              {assetEditNameThai && !addEquipmentForm.nameThai && !addStockForm.equipmentName && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">ชื่ออุปกรณ์</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {assetEditNameThai}
                      {assetEditNameEnglish && ` (${assetEditNameEnglish})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Details Box - Show for add equipment or add stock actions */}
              {(addEquipmentForm.nameThai || addStockForm.equipmentName) && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  {/* Equipment Name */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-1">อุปกรณ์ที่เพิ่ม</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {addEquipmentForm.nameThai ? (
                        <>
                          {addEquipmentForm.nameThai}
                          {addEquipmentForm.nameEnglish && ` (${addEquipmentForm.nameEnglish})`}
                        </>
                      ) : (
                        addStockForm.equipmentName
                      )}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-1">จำนวน</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {addEquipmentForm.quantity || addStockForm.quantity} {addEquipmentForm.unit || equipment.find(e => e.id === addStockForm.equipmentId)?.unit || "ชิ้น"}
                    </p>
                  </div>

                  {/* Date - Only for consumables in stock form */}
                  {addStockForm.equipmentCategory !== "asset" && !addEquipmentForm.nameThai && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">วันที่รับเข้า</p>
                      <p className="text-sm font-semibold text-gray-800">{addStockForm.date}</p>
                    </div>
                  )}

                  {/* Equipment IDs - Only for assets in new equipment form */}
                  {addEquipmentForm.category === "asset" && addEquipmentForm.ids.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">รหัสอุปกรณ์ที่เพิ่ม</p>
                      <p className="text-sm font-semibold text-gray-800">{addEquipmentForm.ids.join(", ")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setSelectedAssetIdToDelete("")
                  setAssetEditNameThai("")
                  setAssetEditNameEnglish("")
                  setAddStockForm({
                    equipmentId: "",
                    equipmentName: "",
                    equipmentCategory: "consumable",
                    quantity: "",
                    date: new Date().toISOString().split('T')[0],
                    referenceNumber: "",
                    assetIds: [],
                    notes: ""
                  })
                }}
                className="w-full py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD EQUIPMENT MODAL ===== */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start z-50">
          <div className="w-screen h-screen bg-white overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              เพิ่มอุปกรณ์ใหม่
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-5 max-w-md mx-auto">
              {/* Category Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">หมวดหมู่</label>
                <select
                  value={addEquipmentForm.category}
                  onChange={(e) => setAddEquipmentForm({ ...addEquipmentForm, category: e.target.value as any, ids: [], quantity: "" })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="consumable">วัสดุสิ้นเปลือง</option>
                  <option value="asset">ครุภัณฑ์</option>
                </select>
              </div>

              {/* Equipment Type Multi-Select */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-700">ประเภทอุปกรณ์</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowManageTypesModal(true)}
                      className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                    >
                      จัดการประเภท
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      + เพิ่มประเภทใหม่
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                  {Object.keys(equipmentTypes).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addEquipmentForm.equipmentTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddEquipmentForm({ ...addEquipmentForm, equipmentTypes: [...addEquipmentForm.equipmentTypes, type] })
                          } else {
                            setAddEquipmentForm({ ...addEquipmentForm, equipmentTypes: addEquipmentForm.equipmentTypes.filter(t => t !== type), equipmentSubTypes: addEquipmentForm.equipmentSubTypes.filter(st => !equipmentTypes[type]?.includes(st)) })
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment SubType Multi-Select */}
              {addEquipmentForm.equipmentTypes.length > 0 && Object.entries(equipmentTypes).some(([type, subTypes]) => addEquipmentForm.equipmentTypes.includes(type) && subTypes.length > 0) && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">ประเภทย่อย</label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                    {Object.entries(equipmentTypes).flatMap(([type, subTypes]) => 
                      addEquipmentForm.equipmentTypes.includes(type) ? subTypes.map((subType) => (
                        <label key={subType} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addEquipmentForm.equipmentSubTypes.includes(subType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddEquipmentForm({ ...addEquipmentForm, equipmentSubTypes: [...addEquipmentForm.equipmentSubTypes, subType] })
                              } else {
                                setAddEquipmentForm({ ...addEquipmentForm, equipmentSubTypes: addEquipmentForm.equipmentSubTypes.filter(st => st !== subType) })
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{subType}</span>
                        </label>
                      )) : []
                    )}
                  </div>
                </div>
              )}

              {/* Equipment Name Thai Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (ไทย)</label>
                <input
                  type="text"
                  value={addEquipmentForm.nameThai}
                  onChange={(e) => setAddEquipmentForm({ ...addEquipmentForm, nameThai: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น โปรเจคเตอร์"
                />
              </div>

              {/* Equipment Name English Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (English)</label>
                <input
                  type="text"
                  value={addEquipmentForm.nameEnglish}
                  onChange={(e) => setAddEquipmentForm({ ...addEquipmentForm, nameEnglish: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น Projector (optional)"
                />
              </div>

              {/* Picture Upload Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">รูปภาพอุปกรณ์</label>
                {!addEquipmentForm.picture ? (
                  <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className="text-4xl mb-2">📷</span>
                      <p className="text-xs text-gray-700 text-center">
                        <span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากรูปมาวางที่นี่
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF ขนาดไม่เกิน 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={addEquipmentForm.picture}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setAddEquipmentForm({ ...addEquipmentForm, picture: undefined })}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-red-600 transition shadow-lg"
                    >
                      ✕
                    </button>
                    <label className="absolute bottom-2 right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg cursor-pointer hover:bg-orange-600 transition shadow-lg">
                      ✎
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Quantity Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">จำนวนเริ่มต้น</label>
                <input
                  type="number"
                  value={addEquipmentForm.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0
                    const newIds = Array(qty).fill("").map((_, i) => addEquipmentForm.ids[i] || "")
                    setAddEquipmentForm({ ...addEquipmentForm, quantity: e.target.value, ids: newIds })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น 5"
                  min="1"
                />
              </div>

              {/* Unit of Measurement Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">หน่วยนับ</label>
                <input
                  type="text"
                  value={addEquipmentForm.unit}
                  onChange={(e) => setAddEquipmentForm({ ...addEquipmentForm, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น ชิ้น, ตัว, เครื่อง, ชุด"
                />
              </div>

              {/* Equipment ID Fields - Only for Asset */}
              {addEquipmentForm.category === "asset" && addEquipmentForm.ids.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-3">รหัสอุปกรณ์</label>
                  <div className="flex flex-col gap-2">
                    {addEquipmentForm.ids.map((id, index) => (
                      <input
                        key={index}
                        type="text"
                        value={id}
                        onChange={(e) => {
                          const newIds = [...addEquipmentForm.ids]
                          newIds[index] = e.target.value
                          setAddEquipmentForm({ ...addEquipmentForm, ids: newIds })
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                        placeholder={`รหัสอุปกรณ์ที่ ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Field */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">หมายเหตุ</label>
                <input
                  type="text"
                  value={addEquipmentForm.notes}
                  onChange={(e) => setAddEquipmentForm({ ...addEquipmentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="ไม่จำเป็นต้องกรอก"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pb-4 justify-end">
                <button
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-6 py-3 border border-gray-400 text-gray-600 rounded-full font-medium hover:bg-gray-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddEquipmentSubmit}
                  disabled={isSubmittingEquipment}
                  className="px-6 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingEquipment ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSET EDIT MODAL (For ครุภัณฑ์ with multiple codes) ===== */}
      {showAssetEditModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start z-50">
          <div className="w-screen h-screen bg-white overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              แก้ไขครุภัณฑ์
            </div>

            {/* Modal Content Wrapper */}
            <div className="p-6 flex flex-col gap-5">

              {/* Equipment Name Thai */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (ไทย)</label>
                <input
                  type="text"
                  value={assetEditNameThai}
                  onChange={(e) => setAssetEditNameThai(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Equipment Name English */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (English)</label>
                <input
                  type="text"
                  value={assetEditNameEnglish}
                  onChange={(e) => setAssetEditNameEnglish(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="(optional)"
                />
              </div>

              {/* Equipment Type Multi-Select */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-700">ประเภทอุปกรณ์</label>
                  <button
                    type="button"
                    onClick={() => setShowAddTypeModal(true)}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                  >
                    + เพิ่มประเภทใหม่
                  </button>
                </div>
                <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                  {Object.keys(equipmentTypes).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assetEditTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssetEditTypes([...assetEditTypes, type])
                          } else {
                            setAssetEditTypes(assetEditTypes.filter(t => t !== type))
                            setAssetEditSubTypes(assetEditSubTypes.filter(st => !equipmentTypes[type]?.includes(st)))
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment SubType Multi-Select */}
              {assetEditTypes.length > 0 && Object.entries(equipmentTypes).some(([type, subTypes]) => assetEditTypes.includes(type) && subTypes.length > 0) && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">ประเภทย่อย</label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                    {Object.entries(equipmentTypes).flatMap(([type, subTypes]) => 
                      assetEditTypes.includes(type) ? subTypes.map((subType) => (
                        <label key={subType} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assetEditSubTypes.includes(subType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssetEditSubTypes([...assetEditSubTypes, subType])
                              } else {
                                setAssetEditSubTypes(assetEditSubTypes.filter(st => st !== subType))
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{subType}</span>
                        </label>
                      )) : []
                    )}
                  </div>
                </div>
              )}

              {/* Picture Section */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">รูปภาพอุปกรณ์</label>
                {!assetEditPicture ? (
                  <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-xs text-gray-500">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const base64String = event.target?.result as string
                            setAssetEditPicture(base64String)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={assetEditPicture}
                      alt="Equipment"
                      className="w-full h-full object-contain bg-gray-50"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <label className="w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-orange-50 transition">
                        <span className="text-sm">✎</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const base64String = event.target?.result as string
                                setAssetEditPicture(base64String)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setAssetEditPicture(undefined)}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Count */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">จำนวนรหัสอุปกรณ์ทั้งหมด</label>
                <div className="px-4 py-2 border border-orange-300 rounded-full text-sm bg-orange-50 text-orange-700 font-semibold">
                  {assetIdsForItem.length - assetEditCodesMarkedForDelete.length} รหัสอุปกรณ์
                  {assetEditCodesMarkedForDelete.length > 0 && ` (จะลบ ${assetEditCodesMarkedForDelete.length})`}
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหารหัสอุปกรณ์..."
                  value={assetCodeSearchTerm}
                  onChange={(e) => setAssetCodeSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              </div>

              {/* Asset Code List Section */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-3">
                  รายการรหัสอุปกรณ์ 
                  <span className="text-orange-600">({assetCodesForItem.filter(c => c.serialCode.toLowerCase().includes(assetCodeSearchTerm.toLowerCase())).length} รายการ)</span>
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 max-h-80 overflow-y-auto">
                  {assetCodesForItem
                    .filter(c => c.serialCode.toLowerCase().includes(assetCodeSearchTerm.toLowerCase()))
                    .map((codeItem, idx) => {
                    const isEditing = editingCodeId === codeItem.docId
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 transition ${
                          isEditing ? "bg-blue-50" : "bg-white hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingCodeValue}
                              onChange={(e) => setEditingCodeValue(e.target.value)}
                              className="w-full px-3 py-1.5 border border-orange-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm font-semibold text-gray-800">
                              {codeItem.serialCode}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {isEditing ? (
                            <>
                              <button
                                onClick={async () => {
                                  // Save the edit
                                  if (editingCodeValue.trim() && editingCodeValue !== codeItem.serialCode) {
                                    try {
                                      // Update from correct collection based on sourceCollection
                                      await updateDoc(doc(db, codeItem.sourceCollection, codeItem.docId), {
                                        serialCode: editingCodeValue.trim()
                                      })
                                      
                                      // Update assetCodesForItem
                                      setAssetCodesForItem(assetCodesForItem.map(c =>
                                        c.docId === codeItem.docId ? { ...c, serialCode: editingCodeValue.trim() } : c
                                      ))
                                      
                                      // Log admin action
                                      if (user) {
                                        logAdminAction({
                                          user,
                                          action: 'edit',
                                          type: 'equipment',
                                          itemName: assetEditNameThai,
                                          details: `แก้ไขรหัสครุภัณฑ์: "${codeItem.serialCode}" → "${editingCodeValue.trim()}"`
                                        })
                                      }
                                    } catch (error) {
                                      console.error("Error updating asset serial code:", error)
                                      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
                                    }
                                  }
                                  setEditingCodeId(null)
                                  setEditingCodeValue("")
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 transition"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCodeId(null)
                                  setEditingCodeValue("")
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                              >
                                ยกเลิก
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCodeId(codeItem.docId)
                                  setEditingCodeValue(codeItem.serialCode)
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleAssetEditCodeDelete(codeItem.docId)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 transition"
                              >
                                ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {assetIdsForItem.filter(id => id.toLowerCase().includes(assetCodeSearchTerm.toLowerCase())).length === 0 && (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      ไม่พบรหัสอุปกรณ์ที่ค้นหา
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 mt-6 pb-4">
                <button
                  onClick={handleAssetEditCancel}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAssetDeleteAll}
                  className="flex-1 py-2 border border-red-500 text-red-500 rounded font-medium hover:bg-red-50 transition"
                >
                  ลบ ครุภัณฑ์
                </button>
                <button
                  onClick={handleAssetEditConfirm}
                  className="flex-1 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 transition"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSET CODE DELETE CONFIRMATION MODAL ===== */}
      {showAssetCodeDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            <div className="bg-red-500 text-white p-4 text-center font-semibold">
              ยืนยันการลบรหัสอุปกรณ์
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">
                คุณต้องการลบรหัสอุปกรณ์นี้หรือไม่?
              </p>
              <p className="text-lg font-bold text-gray-800 mb-4">
                {assetCodesForItem.find(c => c.docId === assetCodeToDelete)?.serialCode || assetCodeToDelete}
              </p>
              <p className="text-xs text-gray-500">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowAssetCodeDeleteConfirm(false)
                  setAssetCodeToDelete("")
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAssetCodeDeleteConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSET DELETE ALL CONFIRMATION MODAL ===== */}
      {showAssetDeleteAllConfirm && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            <div className="bg-red-500 text-white p-4 text-center font-semibold">
              ยืนยันการลบครุภัณฑ์ทั้งหมด
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">
                คุณต้องการลบครุภัณฑ์นี้ทั้งหมดหรือไม่?
              </p>
              <p className="text-lg font-bold text-gray-800 mb-2">
                {assetEditNameThai} {assetEditNameEnglish && `(${assetEditNameEnglish})`}
              </p>
              <p className="text-sm text-orange-600 font-semibold mb-4">
                จะลบทั้งหมด {assetCodesForItem.length} รหัสอุปกรณ์
              </p>
              <p className="text-xs text-gray-500">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowAssetDeleteAllConfirm(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAssetDeleteAllConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
              >
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT EQUIPMENT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-start z-50">
          <div className="w-screen h-screen bg-white overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              แก้ไขอุปกรณ์
            </div>

            {/* Modal Content Wrapper */}
            <div className="p-6 flex flex-col gap-5">

              {/* Equipment Name Thai */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (ไทย)</label>
                <input
                  type="text"
                  value={editForm.nameThai}
                  onChange={(e) => setEditForm({ ...editForm, nameThai: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Equipment Name English */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่ออุปกรณ์ (English)</label>
                <input
                  type="text"
                  value={editForm.nameEnglish}
                  onChange={(e) => setEditForm({ ...editForm, nameEnglish: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="(optional)"
                />
              </div>

              {/* Equipment Type Multi-Select */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-700">ประเภทอุปกรณ์</label>
                  <button
                    type="button"
                    onClick={() => setShowAddTypeModal(true)}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                  >
                    + เพิ่มประเภทใหม่
                  </button>
                </div>
                <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                  {Object.keys(equipmentTypes).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.equipmentTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({ ...editForm, equipmentTypes: [...editForm.equipmentTypes, type] })
                          } else {
                            setEditForm({ ...editForm, equipmentTypes: editForm.equipmentTypes.filter(t => t !== type), equipmentSubTypes: editForm.equipmentSubTypes.filter(st => !equipmentTypes[type]?.includes(st)) })
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment SubType Multi-Select */}
              {editForm.equipmentTypes.length > 0 && Object.entries(equipmentTypes).some(([type, subTypes]) => editForm.equipmentTypes.includes(type) && subTypes.length > 0) && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">ประเภทย่อย</label>
                  <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                    {Object.entries(equipmentTypes).flatMap(([type, subTypes]) => 
                      editForm.equipmentTypes.includes(type) ? subTypes.map((subType) => (
                        <label key={subType} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.equipmentSubTypes.includes(subType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({ ...editForm, equipmentSubTypes: [...editForm.equipmentSubTypes, subType] })
                              } else {
                                setEditForm({ ...editForm, equipmentSubTypes: editForm.equipmentSubTypes.filter(st => st !== subType) })
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{subType}</span>
                        </label>
                      )) : []
                    )}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">จำนวนคงเหลือ</label>
                <input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  min="0"
                />
              </div>

              {/* Unit of Measurement */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">หน่วยนับ</label>
                <input
                  type="text"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น ชิ้น, ตัว, เครื่อง, ชุด"
                />
              </div>

              {/* Picture Section */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">รูปภาพอุปกรณ์</label>
                {!editForm.picture ? (
                  <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 transition">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-xs text-gray-500">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const base64String = event.target?.result as string
                            setEditForm({ ...editForm, picture: base64String })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={editForm.picture}
                      alt="Equipment"
                      className="w-full h-full object-contain bg-gray-50"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <label className="w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-orange-50 transition">
                        <span className="text-sm">✎</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                const base64String = event.target?.result as string
                                setEditForm({ ...editForm, picture: base64String })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, picture: undefined })}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 mt-6 pb-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="flex-1 py-2 border border-red-500 text-red-500 rounded font-medium hover:bg-red-50 transition"
                >
                  ลบ
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 transition"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-red-500 text-white p-4 text-center font-semibold">
              ยืนยันการลบ
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">
                คุณต้องการลบอุปกรณ์ "{editForm.nameThai}{editForm.nameEnglish ? ` (${editForm.nameEnglish})` : ""}" หรือไม่?
              </p>
              {selectedAssetIdToDelete && (
                <p className="text-sm text-orange-600 font-semibold mb-2">
                  รหัสอุปกรณ์: {selectedAssetIdToDelete}
                </p>
              )}
              <p className="text-xs text-gray-500">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setSelectedAssetIdToDelete("")
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT CONFIRMATION MODAL ===== */}
      {showEditConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold">
              ยืนยันการแก้ไข
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">ชื่ออุปกรณ์</p>
                <p className="text-sm font-semibold text-gray-800">
                  {editForm.nameThai}{editForm.nameEnglish ? ` (${editForm.nameEnglish})` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">จำนวนคงเหลือ</p>
                <p className="text-sm font-semibold text-gray-800">{editForm.quantity} {editForm.unit || "ชิ้น"}</p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowEditConfirmModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEditConfirm}
                className="flex-1 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 transition"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD STOCK CONFIRMATION MODAL ===== */}
      {showAddStockConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold">
              ยืนยันการเพิ่มสต๊อก
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">อุปกรณ์</p>
                <p className="text-sm font-semibold text-gray-800">{addStockForm.equipmentName}</p>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">จำนวน</p>
                <p className="text-sm font-semibold text-gray-800">{addStockForm.quantity} {equipment.find(e => e.id === addStockForm.equipmentId)?.unit || "ชิ้น"}</p>
              </div>
              {addStockForm.equipmentCategory !== "asset" && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">วันที่รับเข้า</p>
                  <p className="text-sm font-semibold text-gray-800">{addStockForm.date}</p>
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowAddStockConfirmModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddStockConfirm}
                disabled={isSubmittingStock}
                className="flex-1 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingStock ? "กำลังบันทึก..." : "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD EQUIPMENT TYPE MODAL ===== */}
      {showAddTypeModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-orange-500 text-white p-4 text-center font-semibold sticky top-0">
              เพิ่มประเภทอุปกรณ์ใหม่
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              {/* Type Name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ชื่อประเภท</label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                  placeholder="เช่น งานไฟฟ้า, เครื่องมือวัด"
                />
              </div>

              {/* SubTypes */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">ประเภทย่อย (ถ้ามี)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSubTypeInput}
                    onChange={(e) => setNewSubTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubTypeInput.trim()) {
                        e.preventDefault()
                        setNewTypeSubTypes([...newTypeSubTypes, newSubTypeInput.trim()])
                        setNewSubTypeInput("")
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-orange-500"
                    placeholder="พิมพ์แล้วกด Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubTypeInput.trim()) {
                        setNewTypeSubTypes([...newTypeSubTypes, newSubTypeInput.trim()])
                        setNewSubTypeInput("")
                      }
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 transition"
                  >
                    เพิ่ม
                  </button>
                </div>
                
                {/* SubType List */}
                {newTypeSubTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTypeSubTypes.map((subType, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                      >
                        {subType}
                        <button
                          type="button"
                          onClick={() => setNewTypeSubTypes(newTypeSubTypes.filter((_, i) => i !== index))}
                          className="text-orange-500 hover:text-orange-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowAddTypeModal(false)
                  setNewTypeName("")
                  setNewTypeSubTypes([])
                  setNewSubTypeInput("")
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddNewType}
                className="flex-1 py-2 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Types Modal */}
      {showManageTypesModal && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-blue-500 text-white p-4 text-center font-semibold sticky top-0">
              จัดการประเภทอุปกรณ์
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              {Object.keys(equipmentTypes).map((typeName) => (
                <div key={typeName} className="border border-gray-200 rounded-lg p-4">
                  {/* Type Name with Delete Button */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="font-semibold text-gray-800">{typeName}</h3>
                    <button
                      onClick={() => handleDeleteType(typeName)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded transition"
                    >
                      ลบ
                    </button>
                  </div>

                  {/* SubTypes */}
                  {equipmentTypes[typeName] && equipmentTypes[typeName].length > 0 ? (
                    <div className="space-y-2">
                      {equipmentTypes[typeName].map((subType) => (
                        <div
                          key={subType}
                          className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded"
                        >
                          <span className="text-sm text-gray-700">{subType}</span>
                          <button
                            onClick={() => handleDeleteSubType(typeName, subType)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">ไม่มีประเภทย่อย</p>
                  )}
                </div>
              ))}

              {Object.keys(equipmentTypes).length === 0 && (
                <p className="text-center text-gray-500 py-8">ไม่มีประเภทอุปกรณ์</p>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowManageTypesModal(false)}
                className="flex-1 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteTypeConfirm && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-[70] px-4">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-xs">
            {/* Modal Header */}
            <div className="bg-red-500 text-white p-4 text-center font-semibold">
              ยืนยันการลบ
            </div>

            {/* Modal Content */}
            <div className="p-6 text-center">
              <p className="text-gray-700 mb-2">
                คุณต้องการลบ <span className="font-semibold">{selectedSubTypeToDelete || selectedTypeToDelete}</span> หรือไม่?
              </p>
              {selectedSubTypeToDelete && (
                <p className="text-xs text-gray-500">
                  ประเภท: {selectedTypeToDelete}
                </p>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowDeleteTypeConfirm(false)
                  setSelectedTypeToDelete("")
                  setSelectedSubTypeToDelete("")
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteTypeConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
