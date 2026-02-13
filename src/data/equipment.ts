export interface Equipment {
  id: string
  name: string
  category: string
  type: string
  image: string
  code: string
  available: number
  inStock: boolean
}

export const equipmentData: Equipment[] = [
  {
    id: "1",
    name: "เครื่องเชื่อม GMAW",
    category: "Welding",
    type: "GMAW",
    image: "⚙️",
    code: "GMW-001",
    available: 5,
    inStock: true
  },
  {
    id: "2",
    name: "เครื่องเชื่อม GTAW",
    category: "Welding",
    type: "GTAW",
    image: "⚙️",
    code: "GTW-002",
    available: 0,
    inStock: false
  },
  {
    id: "3",
    name: "เครื่องเชื่อม SMAW",
    category: "Welding",
    type: "SMAW",
    image: "⚙️",
    code: "SMW-003",
    available: 3,
    inStock: true
  },
  {
    id: "4",
    name: "เครื่องเชื่อม GAS",
    category: "Welding",
    type: "GAS",
    image: "⚙️",
    code: "GSW-004",
    available: 2,
    inStock: true
  },
  {
    id: "5",
    name: "เครื่องกลึง",
    category: "Machine",
    type: "Turning",
    image: "🔧",
    code: "TRN-005",
    available: 4,
    inStock: true
  },
  {
    id: "6",
    name: "เครื่องเจาะ",
    category: "Machine",
    type: "Drilling",
    image: "🔩",
    code: "DRL-006",
    available: 6,
    inStock: true
  },
  {
    id: "7",
    name: "เครื่องโสกพื้น",
    category: "Machine",
    type: "Grinding",
    image: "⚡",
    code: "GRD-007",
    available: 1,
    inStock: true
  },
  {
    id: "8",
    name: "เครื่องมิลลิ่ง",
    category: "Machine",
    type: "Milling",
    image: "🔨",
    code: "MIL-008",
    available: 0,
    inStock: false
  }
]

export const categories = ["ทั้งหมด", "Welding", "Machine", "Safety", "Electrical"]

export const welldingTypes = ["GMAW", "GTAW", "SMAW", "GAS"]
export const machineTypes = ["Turning", "Drilling", "Grinding", "Milling"]
