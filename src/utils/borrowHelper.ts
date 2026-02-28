export const getBorrowTypeText = (type: string): string => {
  switch (type) {
    case "during-class":
      return "ยืมในคาบเรียน"
    case "teaching":
      return "ยืมใช้สอน"
    case "outside":
      return "ยืมนอกคาบเรียน"
    default:
      return type
  }
}
