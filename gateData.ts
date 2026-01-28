
import { GateType } from './types';

export const GATE_DATASHEET: Record<GateType, { title: string; description: string; truthTable: string; model: string }> = {
  [GateType.AND]: {
    model: "7408",
    title: "IC 7408 (Quad 2-Input AND)",
    description: "สัญญาณจะเป็น HIGH เมื่ออินพุตทั้งคู่เป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 0\n0 1 | 0\n1 1 | 1"
  },
  [GateType.OR]: {
    model: "7432",
    title: "IC 7432 (Quad 2-Input OR)",
    description: "สัญญาณจะเป็น HIGH เมื่อมีอินพุตตัวใดตัวหนึ่งเป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 1"
  },
  [GateType.NOT]: {
    model: "7404",
    title: "IC 7404 (Hex Inverter/NOT)",
    description: "กลับค่าลอจิกจาก 0 เป็น 1 หรือ 1 เป็น 0",
    truthTable: "IN | OUT\n0  | 1\n1  | 0"
  },
  [GateType.NAND]: {
    model: "7400",
    title: "IC 7400 (Quad 2-Input NAND)",
    description: "จะเป็น LOW เฉพาะเมื่ออินพุตเป็น 1 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 1\n0 1 | 1\n1 1 | 0"
  },
  [GateType.NOR]: {
    model: "7402",
    title: "IC 7402 (Quad 2-Input NOR)",
    description: "จะเป็น HIGH เฉพาะเมื่ออินพุตเป็น 0 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 0\n0 1 | 0\n1 1 | 0"
  },
  [GateType.XOR]: {
    model: "7486",
    title: "IC 7486 (Quad 2-Input XOR)",
    description: "จะเป็น HIGH เมื่ออินพุตทั้งสองมีค่าต่างกัน",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 0"
  },
  [GateType.BUFFER]: {
    model: "7407",
    title: "IC 7407 (Hex Buffer)",
    description: "ส่งผ่านค่าเดิมโดยไม่เปลี่ยนลอจิก",
    truthTable: "IN | OUT\n0  | 0\n1  | 1"
  }
};
