
import { GATE_DATASHEET } from "../gateData";
import { GateType } from "../types";

export async function getGateExplanation(gateType: string) {
  const data = GATE_DATASHEET[gateType as GateType];
  if (!data) return null;
  
  return {
    title: data.title,
    description: data.description,
    truthTable: data.truthTable,
  };
}

export async function checkCircuitChallenge(challenge: string, circuitDescription: string) {
  // ฟังก์ชันนี้จะถูกปิดไว้ชั่วคราวเนื่องจากต้องใช้ AI ในการวิเคราะห์ประโยค
  return "ระบบตรวจสอบอัตโนมัติเปิดใช้งานเฉพาะเวอร์ชันออนไลน์";
}
