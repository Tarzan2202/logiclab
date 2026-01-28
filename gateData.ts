
import { GateType } from './types';

export interface PinMapping {
  inputs: number[][];
  outputs: number[];
  vcc: number;
  gnd: number;
}

export const GATE_DATASHEET: Record<GateType, { title: string; description: string; truthTable: string; model: string; pins: PinMapping }> = {
  [GateType.AND]: {
    model: "74LS08",
    title: "Quad 2-Input AND Gate",
    description: "สัญญาณจะเป็น HIGH เมื่ออินพุตทั้งคู่เป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 0\n0 1 | 0\n1 1 | 1",
    pins: { vcc: 14, gnd: 7, inputs: [[1, 2], [4, 5], [13, 12], [10, 9]], outputs: [3, 6, 11, 8] }
  },
  [GateType.OR]: {
    model: "74LS32",
    title: "Quad 2-Input OR Gate",
    description: "สัญญาณจะเป็น HIGH เมื่อมีอินพุตตัวใดตัวหนึ่งเป็น 1",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 1",
    pins: { vcc: 14, gnd: 7, inputs: [[1, 2], [4, 5], [13, 12], [10, 9]], outputs: [3, 6, 11, 8] }
  },
  [GateType.NOT]: {
    model: "74LS04",
    title: "Hex Inverter",
    description: "กลับค่าลอจิกจาก 0 เป็น 1 หรือ 1 เป็น 0",
    truthTable: "IN | OUT\n0  | 1\n1  | 0",
    pins: { vcc: 14, gnd: 7, inputs: [[1], [3], [5], [9], [11], [13]], outputs: [2, 4, 6, 8, 10, 12] }
  },
  [GateType.NAND]: {
    model: "74LS00",
    title: "Quad 2-Input NAND Gate",
    description: "จะเป็น LOW เฉพาะเมื่ออินพุตเป็น 1 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 1\n0 1 | 1\n1 1 | 0",
    pins: { vcc: 14, gnd: 7, inputs: [[1, 2], [4, 5], [13, 12], [10, 9]], outputs: [3, 6, 11, 8] }
  },
  [GateType.NOR]: {
    model: "74LS02",
    title: "Quad 2-Input NOR Gate",
    description: "จะเป็น HIGH เฉพาะเมื่ออินพุตเป็น 0 ทั้งคู่",
    truthTable: "A B | OUT\n0 0 | 1\n1 0 | 0\n0 1 | 0\n1 1 | 0",
    pins: { vcc: 14, gnd: 7, inputs: [[2, 3], [5, 6], [12, 11], [9, 8]], outputs: [1, 4, 13, 10] }
  },
  [GateType.XOR]: {
    model: "74LS86",
    title: "Quad 2-Input XOR Gate",
    description: "จะเป็น HIGH เมื่ออินพุตทั้งสองมีค่าต่างกัน",
    truthTable: "A B | OUT\n0 0 | 0\n1 0 | 1\n0 1 | 1\n1 1 | 0",
    pins: { vcc: 14, gnd: 7, inputs: [[1, 2], [4, 5], [13, 12], [10, 9]], outputs: [3, 6, 11, 8] }
  },
  [GateType.BUFFER]: {
    model: "74LS07",
    title: "Hex Buffer",
    description: "ส่งผ่านค่าเดิมโดยไม่เปลี่ยนลอจิก",
    truthTable: "IN | OUT\n0  | 0\n1  | 1",
    pins: { vcc: 14, gnd: 7, inputs: [[1], [3], [5], [9], [11], [13]], outputs: [2, 4, 6, 8, 10, 12] }
  }
};
