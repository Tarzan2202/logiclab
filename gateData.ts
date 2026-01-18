
import { GateType } from './types';

export const GATE_DATASHEET: Record<GateType, { title: string; description: string; truthTable: string }> = {
  [GateType.AND]: {
    title: "SN7408 Quad 2-Input AND Gate",
    description: "เอาต์พุตจะเป็น 1 (HIGH) ก็ต่อเมื่ออินพุตทุกตัวเป็น 1 เท่านั้น",
    truthTable: "A=0, B=0 -> 0\nA=1, B=0 -> 0\nA=0, B=1 -> 0\nA=1, B=1 -> 1"
  },
  [GateType.OR]: {
    title: "SN7432 Quad 2-Input OR Gate",
    description: "เอาต์พุตจะเป็น 1 (HIGH) ถ้ามีอินพุตตัวใดตัวหนึ่งหรือทั้งคู่เป็น 1",
    truthTable: "A=0, B=0 -> 0\nA=1, B=0 -> 1\nA=0, B=1 -> 1\nA=1, B=1 -> 1"
  },
  [GateType.NOT]: {
    title: "SN7404 Hex Inverter (NOT Gate)",
    description: "กลับค่าลอจิก: ถ้าเข้า 1 ออก 0, ถ้าเข้า 0 ออก 1",
    truthTable: "A=0 -> 1\nA=1 -> 0"
  },
  [GateType.NAND]: {
    title: "SN7400 Quad 2-Input NAND Gate",
    description: "ตรงข้ามกับ AND: จะเป็น 0 (LOW) เฉพาะเมื่ออินพุตทุกตัวเป็น 1",
    truthTable: "A=0, B=0 -> 1\nA=1, B=0 -> 1\nA=0, B=1 -> 1\nA=1, B=1 -> 0"
  },
  [GateType.NOR]: {
    title: "SN7402 Quad 2-Input NOR Gate",
    description: "ตรงข้ามกับ OR: จะเป็น 1 (HIGH) เฉพาะเมื่ออินพุตทุกตัวเป็น 0",
    truthTable: "A=0, B=0 -> 1\nA=1, B=0 -> 0\nA=0, B=1 -> 0\nA=1, B=1 -> 0"
  },
  [GateType.XOR]: {
    title: "SN7486 Quad 2-Input XOR Gate",
    description: "เอาต์พุตเป็น 1 เฉพาะเมื่ออินพุตทั้งสองมีค่าต่างกัน (Exclusive OR)",
    truthTable: "A=0, B=0 -> 0\nA=1, B=0 -> 1\nA=0, B=1 -> 1\nA=1, B=1 -> 0"
  },
  [GateType.BUFFER]: {
    title: "SN7407 Hex Buffer",
    description: "ส่งผ่านค่าลอจิกเดิมออกไปโดยไม่เปลี่ยนแปลง มักใช้ขยายสัญญาณ",
    truthTable: "A=0 -> 0\nA=1 -> 1"
  }
};
