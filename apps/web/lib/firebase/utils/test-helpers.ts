import { MachineType } from '../services/users'

// Machine test configurations
export const MACHINE_TESTS = {
  G1: {
    name: 'G1 Machine',
    tests: [
      { key: 'hardness', label: 'Hardness', unit: 'ShA' },
      { key: 'density', label: 'Density', unit: 'g/cm³' }
    ]
  },
  G2: {
    name: 'G2 Machine',
    tests: [
      { key: 'ts1', label: 'TS-1', unit: 'MPa' },
      { key: 'ts2', label: 'TS-2', unit: 'MPa' },
      { key: 'ts3', label: 'TS-3', unit: 'MPa' },
      { key: 'ts4', label: 'TS-4', unit: 'MPa' },
      { key: 'elongation1', label: 'Elongation %1', unit: '%' },
      { key: 'elongation2', label: 'Elongation %2', unit: '%' },
      { key: 'elongation3', label: 'Elongation %3', unit: '%' },
      { key: 'elongation4', label: 'Elongation %4', unit: '%' },
      { key: 'tearStrength', label: 'Tear Strength', unit: 'N/mm' }
    ]
  },
  G3: {
    name: 'G3 Machine',
    tests: [
      { key: 'mooneyViscosity', label: 'Mooney Viscosity', unit: 'MU' },
      { key: 'rheoTS2Min', label: 'Rheo (TS2)', unit: 'min' },
      { key: 'rheoTS2Sec', label: 'TS2', unit: 'sec' },
      { key: 'rheoTC90Min', label: 'Rheo (TC90)', unit: 'min' },
      { key: 'rheoTC90Sec', label: 'TC90', unit: 'sec' }
    ]
  }
}

// Get tests for a specific machine
export function getMachineTests(machine: MachineType) {
  return MACHINE_TESTS[machine]?.tests || []
}

// Get all test keys for a machine
export function getMachineTestKeys(machine: MachineType): string[] {
  return MACHINE_TESTS[machine]?.tests.map(t => t.key) || []
}

// Validate if a test belongs to a machine
export function isValidTestForMachine(machine: MachineType, testKey: string): boolean {
  return getMachineTestKeys(machine).includes(testKey)
}

// Get machine name
export function getMachineName(machine: MachineType): string {
  return MACHINE_TESTS[machine]?.name || machine
}

// Format shift options
export const SHIFT_OPTIONS = [
  { value: 'A', label: 'Shift A' },
  { value: 'B', label: 'Shift B' },
  { value: 'C', label: 'Shift C' }
]

// Status display configuration
export const STATUS_CONFIG = {
  pending_g1: {
    label: 'Pending G1 Test',
    color: 'bg-yellow-100 text-yellow-700',
    icon: '⏳'
  },
  pending_g2: {
    label: 'Pending G2 Test',
    color: 'bg-orange-100 text-orange-700',
    icon: '⏳'
  },
  pending_g3: {
    label: 'Pending G3 Test',
    color: 'bg-blue-100 text-blue-700',
    icon: '⏳'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
    icon: '✓'
  }
}

// Get status display info
export function getStatusDisplay(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status,
    color: 'bg-gray-100 text-gray-700',
    icon: '?'
  }
}

// Calculate test completion percentage
export function calculateCompletionPercentage(testData: any): number {
  let completed = 0
  let total = 3 // Total number of machines
  
  if (testData.g1Tests?.completedAt) completed++
  if (testData.g2Tests?.completedAt) completed++
  if (testData.g3Tests?.completedAt) completed++
  
  return Math.round((completed / total) * 100)
}

// Get next machine in sequence
export function getNextMachine(currentMachine: MachineType): MachineType | null {
  switch (currentMachine) {
    case 'G1':
      return 'G2'
    case 'G2':
      return 'G3'
    case 'G3':
      return null
    default:
      return null
  }
}

// Get previous machine in sequence
export function getPreviousMachine(currentMachine: MachineType): MachineType | null {
  switch (currentMachine) {
    case 'G1':
      return null
    case 'G2':
      return 'G1'
    case 'G3':
      return 'G2'
    default:
      return null
  }
}

// Format test value with unit
export function formatTestValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '-'
  return `${value} ${unit}`
}

// Validate test values
export function validateTestValues(values: Record<string, any>, machine: MachineType): string[] {
  const errors: string[] = []
  const requiredTests = getMachineTests(machine)
  
  requiredTests.forEach(test => {
    const value = values[test.key]
    if (value === undefined || value === null || value === '') {
      errors.push(`${test.label} is required`)
    } else if (isNaN(Number(value))) {
      errors.push(`${test.label} must be a valid number`)
    } else if (Number(value) < 0) {
      errors.push(`${test.label} cannot be negative`)
    }
  })
  
  return errors
} 

