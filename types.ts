
export enum GateType {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  NAND = 'NAND',
  NOR = 'NOR',
  XOR = 'XOR',
  BUFFER = 'BUFFER',
  DRIVER_4CH = 'DRIVER_4CH'
}

export enum EntityType {
  GATE = 'GATE',
  POWER = 'POWER',
  SWITCH_PANEL = 'SWITCH_PANEL',
  LED_PANEL = 'LED_PANEL',
  SEVEN_SEGMENT = 'SEVEN_SEGMENT',
  VOLTAGE_ADJUSTER = 'VOLTAGE_ADJUSTER'
}

export interface CircuitEntity {
  id: string;
  type: EntityType;
  gateType?: GateType; 
  position: { x: number; y: number };
  state?: any; 
}
