
import { GateType } from './types';

export const GATE_DATASHEET: Record<GateType, { title: string; description: string; truthTable: string; model: string }> = {
  [GateType.AND]: {
    model: "74LS08",
    title: "IC 74LS08 (Quad 2-Input AND)",
    description: "สัญญาณจะเป็น HIGH เมื่ออินพุตทั้งคู่เป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 0\n0 1 | 0\n1 1 | 1"
  },
  [GateType.OR]: {
    model: "74LS32",
    title: "IC 74LS32 (Quad 2-Input OR)",
    description: "สัญญาณจะเป็น HIGH เมื่อมีอินพุตตัวใดตัวหนึ่งเป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 1"
  },
  [GateType.NOT]: {
    model: "74LS04",
    title: "IC 74LS04 (Hex Inverter/NOT)",
    description: "กลับค่าลอจิกจาก 0 เป็น 1 หรือ 1 เป็น 0",
    truthTable: "IN | OUT\n0  | 1\n1  | 0"
  },
  [GateType.NAND]: {
    model: "74LS00",
    title: "IC 74LS00 (Quad 2-Input NAND)",
    description: "จะเป็น LOW เฉพาะเมื่ออินพุตเป็น 1 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 1\n0 1 | 1\n1 1 | 0"
  },
  [GateType.NOR]: {
    model: "74LS02",
    title: "IC 74LS02 (Quad 2-Input NOR)",
    description: "จะเป็น HIGH เฉพาะเมื่ออินพุตเป็น 0 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 0\n0 1 | 0\n1 1 | 0"
  },
  [GateType.XOR]: {
    model: "74LS86",
    title: "IC 74LS86 (Quad 2-Input XOR)",
    description: "จะเป็น HIGH เมื่ออินพุตทั้งสองมีค่าต่างกัน",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 0"
  },
  [GateType.BUFFER]: {
    model: "74LS07",
    title: "IC 74LS07 (Hex Buffer)",
    description: "ส่งผ่านค่าเดิมโดยไม่เปลี่ยนลอจิก",
    truthTable: "IN | OUT\n0  | 0\n1  | 1"
  }
};